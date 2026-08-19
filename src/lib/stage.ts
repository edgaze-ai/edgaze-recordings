import { fillAssets } from './assets';
import { applyExportProgress, requestExport, type ExportProgress } from './export';
import { prepare } from './reveal';
import { type ClipFormat, formatClock } from './scene-meta';
import { Timeline } from './timeline';

const FRAME = 1000 / 60;
const LOOP_HOLD = 400;

/**
 * Why: preview and record are different jobs. Preview must fit a laptop
 * display; record must still yield at least `width` real pixels on retina.
 * The editor clock is seekable so play, pause, scrub, and export share one
 * timeline — wall-clock WAAPI cannot rewind class cues or typed text.
 */
export function mountStage(config: {
  width: number;
  height: number;
  duration: number;
  build: (tl: Timeline, stage: HTMLElement) => void;
  still?: (stage: HTMLElement) => void;
}): void {
  const stage = document.querySelector<HTMLElement>('.stage');
  if (!stage) throw new Error('Missing .stage');

  const chrome = document.querySelector<HTMLElement>('.chrome');
  if (chrome) ensureEditor(chrome, config.duration);

  const playBtn = document.querySelector('#play');
  const replay = document.querySelector('#replay');
  const slow = document.querySelector('#slow');
  const rec = document.querySelector('#rec');
  const exportMp4 = document.querySelector('#export-mp4');
  const exportMov = document.querySelector('#export-mov');
  const status = document.querySelector('#status');
  const clock = document.querySelector('#clock');
  const rail = document.querySelector('#rail');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const autoExport = new URLSearchParams(location.search).get('export');
  const scene =
    location.pathname
      .split('/')
      .filter((part) => part && part !== 'index.html')
      .at(-1) ?? 'scene';

  let rate = 1;
  let recording = autoExport === '1';
  let tl: Timeline | null = null;
  let exporting = false;
  let playing = false;
  let time = 0;
  let lastSeek = -1;
  let origin = 0;
  let raf = 0;
  let loopHold = 0;
  let scrubbing = false;
  let resumeAfterScrub = false;
  let snapshot = '';
  let scrubApply = 0;

  stage.style.width = `${config.width}px`;
  stage.style.height = `${config.height}px`;
  prepare(document);
  fillAssets(stage);
  snapshot = stage.innerHTML;
  if (recording) document.body.classList.add('rec');

  const statusText = (message: string) => {
    if (status instanceof HTMLElement) status.textContent = message;
  };

  const setRecording = (on: boolean) => {
    recording = on;
    document.body.classList.toggle('rec', on);
    rec?.classList.toggle('on', on);
    fit();
  };

  const fit = () => {
    if (autoExport === '1') {
      document.documentElement.style.setProperty('--zoom', '1');
      stage.style.marginLeft = '0px';
      stage.style.marginTop = '0px';
      return;
    }
    const dpr = window.devicePixelRatio || 1;
    const pad = recording ? 0 : 120;
    const fitScale = Math.min(
      (window.innerWidth - pad) / config.width,
      (window.innerHeight - pad) / config.height,
    );
    const zoom = recording ? Math.max(1 / dpr, Math.min(1, fitScale)) : Math.min(1, fitScale);
    document.documentElement.style.setProperty('--zoom', String(zoom));
    const left = Math.max(0, (window.innerWidth - config.width * zoom) / 2);
    const top = Math.max(0, (window.innerHeight - config.height * zoom) / 2);
    stage.style.marginLeft = `${left}px`;
    stage.style.marginTop = `${top}px`;
  };

  const paint = () => {
    const ratio = config.duration > 0 ? time / config.duration : 0;
    if (clock instanceof HTMLElement) {
      clock.textContent = `${formatClock(time)} / ${formatClock(config.duration)}`;
    }
    if (rail instanceof HTMLElement) {
      rail.style.setProperty('--playhead', String(ratio));
      rail.setAttribute('aria-valuenow', String(Math.round(time)));
      rail.setAttribute('aria-valuetext', formatClock(time));
    }
    if (playBtn instanceof HTMLElement) {
      playBtn.textContent = playing ? 'Pause' : 'Play';
    }
  };

  const stopClock = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const rebuild = () => {
    tl?.clear();
    stage.innerHTML = snapshot;
    stage.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    tl = new Timeline(1, true);
    config.build(tl, stage);
    lastSeek = 0;
    tl.seek(0);
  };

  const applyTime = () => {
    scrubApply = 0;
    const t = time;
    if (!tl || t < lastSeek - 0.5) rebuild();
    tl?.seek(t);
    lastSeek = t;
  };

  const seekTo = (ms: number, immediate = true) => {
    time = Math.max(0, Math.min(config.duration, ms));
    paint();
    if (immediate || !scrubbing || time >= lastSeek - 0.5) {
      if (scrubApply) window.clearTimeout(scrubApply);
      applyTime();
      return;
    }
    if (!scrubApply) scrubApply = window.setTimeout(applyTime, 48);
  };

  const syncOrigin = (now = performance.now()) => {
    origin = now - time / rate;
    loopHold = 0;
  };

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick);
    if (!playing || scrubbing) return;
    const elapsed = (now - origin) * rate;
    if (elapsed >= config.duration) {
      if (!loopHold) {
        loopHold = now;
        seekTo(config.duration);
        return;
      }
      if (now - loopHold < LOOP_HOLD) return;
      loopHold = 0;
      time = 0;
      rebuild();
      lastSeek = 0;
      time = 0;
      paint();
      origin = now;
      return;
    }
    loopHold = 0;
    seekTo(elapsed);
  };

  const startClock = () => {
    if (raf) return;
    raf = requestAnimationFrame(tick);
  };

  const setPlaying = (on: boolean) => {
    if (reduce.matches) return;
    playing = on;
    if (on) {
      if (time >= config.duration) {
        time = 0;
        rebuild();
        lastSeek = 0;
        time = 0;
      }
      syncOrigin();
      startClock();
    } else {
      stopClock();
    }
    paint();
  };

  const playFromStart = () => {
    time = 0;
    rebuild();
    lastSeek = 0;
    time = 0;
    paint();
    setPlaying(true);
  };

  const showStill = () => {
    stopClock();
    playing = false;
    tl?.clear();
    stage.innerHTML = snapshot;
    config.still?.(stage);
    time = 0;
    lastSeek = -1;
    paint();
  };

  const playOnce = (onTick?: (ms: number, duration: number) => void) =>
    new Promise<void>((resolve) => {
      stopClock();
      playing = false;
      time = 0;
      rebuild();
      lastSeek = 0;
      time = 0;
      paint();
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min(config.duration, now - started);
        seekTo(t);
        onTick?.(t, config.duration);
        if (t >= config.duration) {
          raf = 0;
          resolve();
          return;
        }
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });

  const runExport = async (format: ClipFormat) => {
    if (exporting) return;
    exporting = true;
    const wasPlaying = playing;
    setPlaying(false);
    stopClock();
    document.body.classList.add('busy');
    applyExportProgress({
      phase: 'queued',
      percent: 0,
      label: `Exporting ${format.toUpperCase()}`,
    });
    try {
      await requestExport(format, {
        scene,
        stage,
        duration: config.duration,
        playOnce,
        setRecording,
        onStatus: statusText,
        onProgress: (progress: ExportProgress) => {
          applyExportProgress({
            ...progress,
            label: progress.label || `Exporting ${format.toUpperCase()}`,
          });
        },
      });
    } catch (error) {
      applyExportProgress(null);
      statusText(error instanceof Error ? error.message : 'Export failed');
    } finally {
      exporting = false;
      document.body.classList.remove('busy');
      applyExportProgress(null);
      if (!reduce.matches && autoExport !== '1' && wasPlaying) {
        time = 0;
        rebuild();
        lastSeek = 0;
        time = 0;
        setPlaying(true);
      } else {
        paint();
      }
    }
  };

  const seekFromPointer = (event: PointerEvent, immediate = false) => {
    if (!(rail instanceof HTMLElement)) return;
    const rect = rail.getBoundingClientRect();
    const ratio =
      rect.width <= 0 ? 0 : Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * config.duration, immediate);
    syncOrigin();
  };

  playBtn?.addEventListener('click', () => {
    if (reduce.matches) {
      showStill();
      return;
    }
    setPlaying(!playing);
  });

  replay?.addEventListener('click', () => {
    if (reduce.matches) showStill();
    else playFromStart();
  });

  slow?.addEventListener('click', () => {
    rate = rate === 1 ? 0.25 : 1;
    slow.classList.toggle('on', rate !== 1);
    syncOrigin();
  });

  rec?.addEventListener('click', () => {
    setRecording(!recording);
  });

  exportMp4?.addEventListener('click', () => {
    void runExport('mp4');
  });
  exportMov?.addEventListener('click', () => {
    void runExport('mov');
  });

  if (rail instanceof HTMLElement) {
    rail.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || exporting) return;
      event.preventDefault();
      resumeAfterScrub = playing;
      scrubbing = true;
      playing = false;
      stopClock();
      rail.setPointerCapture(event.pointerId);
      seekFromPointer(event, true);
      paint();
    });
    rail.addEventListener('pointermove', (event) => {
      if (!scrubbing) return;
      seekFromPointer(event);
    });
    const endScrub = () => {
      if (!scrubbing) return;
      scrubbing = false;
      seekTo(time, true);
      if (resumeAfterScrub && !reduce.matches) setPlaying(true);
      else paint();
    };
    rail.addEventListener('pointerup', endScrub);
    rail.addEventListener('pointercancel', endScrub);
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && recording && !exporting) {
      setRecording(false);
      return;
    }
    if (autoExport === '1' || exporting || recording) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const typing =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable);
    if (typing) return;

    if (event.code === 'Space') {
      if (
        event.target instanceof HTMLButtonElement ||
        event.target instanceof HTMLAnchorElement
      ) {
        return;
      }
      event.preventDefault();
      if (reduce.matches) return;
      setPlaying(!playing);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      seekTo(0);
      syncOrigin();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      seekTo(config.duration);
      syncOrigin();
      setPlaying(false);
      return;
    }
    const frameStep = event.code === 'Comma' || event.code === 'Period';
    const step = event.shiftKey ? 5000 : frameStep ? FRAME : 1000;
    if (event.code === 'ArrowLeft' || event.code === 'KeyJ' || event.code === 'Comma') {
      event.preventDefault();
      seekTo(time - step);
      syncOrigin();
      return;
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyL' || event.code === 'Period') {
      event.preventDefault();
      seekTo(time + step);
      syncOrigin();
    }
  });

  window.addEventListener('resize', fit);
  fit();

  window.__edgazeExport = {
    width: config.width,
    height: config.height,
    duration: config.duration,
  };
  window.__edgazeArm = () => {
    stopClock();
    playing = false;
    rebuild();
    time = 0;
    lastSeek = 0;
    paint();
  };
  window.__edgazeSeek = (ms: number) => {
    seekTo(ms);
  };
  window.__edgazeTime = () => time;
  window.__edgazeStart = () =>
    playOnce().then(() => {
      window.__edgazeDone = true;
    });

  if (autoExport === '1') {
    return;
  }

  if (reduce.matches) showStill();
  else playFromStart();
}

function ensureEditor(chrome: HTMLElement, duration: number): void {
  if (!document.querySelector('#play')) {
    const play = document.createElement('button');
    play.id = 'play';
    play.type = 'button';
    play.textContent = 'Pause';
    const replay = document.querySelector('#replay');
    chrome.insertBefore(play, replay ?? chrome.firstChild);
  }

  if (!document.querySelector('#clock')) {
    const clock = document.createElement('span');
    clock.id = 'clock';
    clock.className = 'clock';
    clock.textContent = `0:00.0 / ${formatClock(duration)}`;
    const slow = document.querySelector('#slow');
    (slow ?? document.querySelector('#play'))?.after(clock);
  }

  const rail = document.querySelector('#rail');
  if (!rail) {
    const next = document.createElement('div');
    next.id = 'rail';
    next.className = 'rail';
    next.tabIndex = 0;
    next.setAttribute('role', 'slider');
    next.setAttribute('aria-label', 'Timeline');
    next.setAttribute('aria-valuemin', '0');
    next.setAttribute('aria-valuemax', String(duration));
    next.innerHTML =
      '<i class="rail-track"></i><i class="rail-fill"></i><i class="rail-head-wrap"><b></b></i>';
    document.querySelector('#clock')?.after(next);
  } else {
    rail.setAttribute('aria-valuemax', String(duration));
  }

  if (!document.querySelector('#xfer')) {
    const xfer = document.createElement('div');
    xfer.id = 'xfer';
    xfer.className = 'xfer';
    xfer.hidden = true;
    xfer.innerHTML =
      '<div class="xfer-meta"><span id="xfer-label"></span><span id="xfer-pct" class="xfer-pct"></span></div>' +
      '<div class="xfer-rail"><i id="xfer-fill"></i></div>';
    chrome.append(xfer);
  }
}
