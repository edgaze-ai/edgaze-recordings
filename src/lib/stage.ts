import { fillAssets } from './assets';
import { type MusicSpec, Soundtrack } from './audio';
import { type BeatMap } from './beatgrid';
import {
  buildEditor,
  drawWave,
  loadSession,
  preciseClock,
  prefs,
  saveSession,
  whereInBars,
} from './editor';
import { applyExportProgress, requestExport, type ExportProgress } from './export';
import { settled } from './footage';
import { guardReloads } from './hot';
import { icons } from './icons';
import { prepare } from './reveal';
import { type Score } from './score';
import { type ClipFormat, formatClock } from './scene-meta';
import { Timeline } from './timeline';

const FRAME = 1000 / 60;
const LOOP_HOLD = 400;
/** Gap between the stage and the window edges / dock in preview. */
const PREVIEW_PAD = 28;

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
  /**
   * The soundtrack, written in the same absolute ms as `build`. Rendered
   * offline, played in sync in preview, and muxed into every export.
   */
  score?: (s: Score) => void;
  /** Tempo the score's beat helpers use. Default 120 (500ms beat). */
  bpm?: number;
  /** Optional licensed track from src/assets/music; mutes synth music. */
  music?: MusicSpec;
  /**
   * The beat map the storyboard is cut to. Bars, sections and drops are
   * drawn on the editor timeline so a late cut is visible, not just audible.
   */
  beats?: BeatMap;
}): void {
  const stage = document.querySelector<HTMLElement>('.stage');
  if (!stage) throw new Error('Missing .stage');

  const sound = config.score
    ? new Soundtrack(config.score, config.bpm ?? 120, config.duration, config.music)
    : null;
  // Preview mute is a preference of this machine, not of the film: the
  // export renders the mix offline and always carries it.
  if (sound) sound.muted = prefs.muted;

  let chrome = document.querySelector<HTMLElement>('.chrome');
  if (!chrome) {
    chrome = document.createElement('div');
    document.body.append(chrome);
  }
  const ui = buildEditor(chrome, {
    width: config.width,
    height: config.height,
    duration: config.duration,
    hasSound: Boolean(sound),
    beats: config.beats,
  });

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
  const painted = { clock: '', where: '', playing: true, aria: -1 };

  stage.style.width = `${config.width}px`;
  stage.style.height = `${config.height}px`;
  prepare(document);
  fillAssets(stage);
  snapshot = stage.innerHTML;
  if (recording) document.body.classList.add('rec');

  const statusText = (message: string) => {
    ui.status.textContent = message;
  };

  let toastTimer = 0;
  const toast = (message: string, ms = 1600) => {
    statusText(message);
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastTimer = 0;
      if (!exporting) statusText('');
    }, ms);
  };

  const setRecording = (on: boolean) => {
    recording = on;
    document.body.classList.toggle('rec', on);
    ui.rec.classList.toggle('on', on);
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
    // The dock owns the bottom of the window; the stage fits the rest.
    const dock = recording ? 0 : ui.dock.getBoundingClientRect().height;
    const pad = recording ? 0 : PREVIEW_PAD * 2;
    const roomW = window.innerWidth - pad;
    const roomH = window.innerHeight - dock - pad;
    const fitScale = Math.min(roomW / config.width, roomH / config.height);
    const zoom = recording ? Math.max(1 / dpr, Math.min(1, fitScale)) : Math.min(1, fitScale);
    document.documentElement.style.setProperty('--zoom', String(zoom));
    const left = Math.max(0, (window.innerWidth - config.width * zoom) / 2);
    const top = recording
      ? Math.max(0, (window.innerHeight - config.height * zoom) / 2)
      : Math.max(0, (window.innerHeight - dock - config.height * zoom) / 2);
    // CSS zoom scales the element's own margins, so divide them back out.
    stage.style.marginLeft = `${left / zoom}px`;
    stage.style.marginTop = `${top / zoom}px`;
  };

  /** Writes only what changed; the clock runs every frame. */
  const paint = () => {
    const ratio = config.duration > 0 ? time / config.duration : 0;
    ui.rail.style.setProperty('--playhead', String(ratio));
    const clock = preciseClock(time);
    if (clock !== painted.clock) {
      ui.clock.textContent = clock;
      painted.clock = clock;
    }
    if (config.beats) {
      const where = whereInBars(config.beats, time);
      if (where !== painted.where) {
        ui.where.textContent = where;
        painted.where = where;
      }
    }
    // Screen readers do not need 60 updates a second; settle on pause.
    const aria = playing && !scrubbing ? Math.round(time / 1000) * 1000 : Math.round(time);
    if (aria !== painted.aria) {
      ui.rail.setAttribute('aria-valuenow', String(aria));
      ui.rail.setAttribute('aria-valuetext', formatClock(time));
      painted.aria = aria;
    }
    if (playing !== painted.playing) {
      ui.play.innerHTML = playing ? icons.pause : icons.play;
      const tip = playing ? 'Pause (Space)' : 'Play (Space)';
      ui.play.setAttribute('aria-label', tip);
      ui.play.dataset.tip = tip;
      painted.playing = playing;
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
    // Audio follows the playhead; at 0.25× it stays quiet rather than
    // pitch down and drift.
    if (sound) {
      if (playing && rate === 1 && time < config.duration) sound.play(time);
      else sound.stop();
    }
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
      if (sound && rate === 1) sound.play(0);
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
      sound?.stop();
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
    sound?.stop();
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
    sound?.stop();
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
      toast(ui.status.textContent || 'Exported', 4000);
    } catch (error) {
      applyExportProgress(null);
      toast(error instanceof Error ? error.message : 'Export failed', 6000);
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

  const step = (ms: number) => {
    if (playing) setPlaying(false);
    seekTo(time + ms);
    syncOrigin();
  };

  const toggleSlow = () => {
    rate = rate === 1 ? 0.25 : 1;
    ui.slow.setAttribute('aria-pressed', String(rate !== 1));
    syncOrigin();
  };

  const paintSound = () => {
    if (!ui.sound || !sound) return;
    ui.sound.innerHTML = sound.muted ? icons.muted : icons.sound;
    ui.sound.classList.toggle('off', sound.muted);
    const tip = sound.muted ? 'Unmute preview (M)' : 'Mute preview (M)';
    ui.sound.setAttribute('aria-label', tip);
    ui.sound.setAttribute('aria-pressed', String(sound.muted));
    ui.sound.dataset.tip = tip;
  };

  const toggleMute = () => {
    if (!sound) return;
    sound.muted = !sound.muted;
    prefs.muted = sound.muted;
    paintSound();
    syncOrigin();
    toast(sound.muted ? 'Preview muted · exports keep sound' : 'Preview sound on');
  };

  ui.play.addEventListener('click', () => {
    if (reduce.matches) {
      showStill();
      return;
    }
    setPlaying(!playing);
  });

  ui.replay.addEventListener('click', () => {
    if (reduce.matches) showStill();
    else playFromStart();
  });

  ui.toStart.addEventListener('click', () => {
    seekTo(0);
    syncOrigin();
  });

  ui.toEnd.addEventListener('click', () => {
    setPlaying(false);
    seekTo(config.duration);
    syncOrigin();
  });

  ui.frameBack.addEventListener('click', () => step(-FRAME));
  ui.frameNext.addEventListener('click', () => step(FRAME));
  ui.slow.addEventListener('click', toggleSlow);
  ui.sound?.addEventListener('click', toggleMute);
  paintSound();

  if (sound) {
    // Browsers hold audio until the first gesture. Re-cue from the playhead
    // on that gesture so sound joins in sync instead of from zero.
    const unlock = () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      sound.unlock();
      if (playing && rate === 1) sound.play(time);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  ui.rec.addEventListener('click', () => {
    setRecording(!recording);
  });

  ui.mp4.addEventListener('click', () => {
    void runExport('mp4');
  });
  ui.mov.addEventListener('click', () => {
    void runExport('mov');
  });

  // ── timeline scrub and hover ─────────────────────────────────────────
  // Pointer events can arrive at 120–240Hz; seek at most once per frame.
  const rail = ui.rail;
  const lanes = ui.lanes;
  let railBox: DOMRect | null = null;
  let pendingX: number | null = null;
  let pointerRaf = 0;

  const ratioAt = (clientX: number) => {
    const rect = railBox ?? lanes.getBoundingClientRect();
    return rect.width <= 0 ? 0 : Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };

  const flushPointer = () => {
    pointerRaf = 0;
    if (pendingX === null) return;
    const ratio = ratioAt(pendingX);
    pendingX = null;
    ui.hover.style.setProperty('--hover', String(ratio));
    ui.hoverTime.textContent = preciseClock(ratio * config.duration);
    if (scrubbing) {
      seekTo(ratio * config.duration, false);
      syncOrigin();
    }
  };

  const queuePointer = (clientX: number) => {
    pendingX = clientX;
    if (!pointerRaf) pointerRaf = requestAnimationFrame(flushPointer);
  };

  rail.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || exporting) return;
    event.preventDefault();
    rail.focus({ preventScroll: true });
    railBox = lanes.getBoundingClientRect();
    resumeAfterScrub = playing;
    scrubbing = true;
    playing = false;
    stopClock();
    sound?.stop();
    rail.setPointerCapture(event.pointerId);
    seekTo(ratioAt(event.clientX) * config.duration, true);
    syncOrigin();
    paint();
  });
  rail.addEventListener('pointermove', (event) => {
    ui.hover.hidden = false;
    queuePointer(event.clientX);
  });
  rail.addEventListener('pointerleave', () => {
    if (!scrubbing) ui.hover.hidden = true;
  });
  const endScrub = () => {
    if (!scrubbing) return;
    if (pointerRaf) {
      cancelAnimationFrame(pointerRaf);
      flushPointer();
    }
    scrubbing = false;
    railBox = null;
    seekTo(time, true);
    if (resumeAfterScrub && !reduce.matches) setPlaying(true);
    else paint();
  };
  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', endScrub);

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
    if (event.code === 'KeyM') {
      event.preventDefault();
      toggleMute();
      return;
    }
    if (event.code === 'KeyS') {
      event.preventDefault();
      toggleSlow();
      return;
    }
    if (event.code === 'KeyR') {
      event.preventDefault();
      if (reduce.matches) showStill();
      else playFromStart();
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
    const amount = event.shiftKey ? 5000 : frameStep ? FRAME : 1000;
    if (event.code === 'ArrowLeft' || event.code === 'KeyJ' || event.code === 'Comma') {
      event.preventDefault();
      seekTo(time - amount);
      syncOrigin();
      return;
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyL' || event.code === 'Period') {
      event.preventDefault();
      seekTo(time + amount);
      syncOrigin();
    }
  });

  // A resize burst (dragging the window) fits once per frame, not per event.
  let fitRaf = 0;
  const queueFit = () => {
    if (fitRaf) return;
    fitRaf = requestAnimationFrame(() => {
      fitRaf = 0;
      fit();
    });
  };
  window.addEventListener('resize', queueFit);
  new ResizeObserver(queueFit).observe(ui.dock);
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
  window.__edgazeSettle = settled;
  window.__edgazeTime = () => time;
  window.__edgazeBeats = config.beats;
  window.__edgazeAudio = () => (sound ? sound.wavBase64() : Promise.resolve(null));
  window.__edgazeStart = () =>
    playOnce().then(() => {
      window.__edgazeDone = true;
    });

  if (autoExport === '1') {
    // The capture page must never reload under an export in flight.
    guardReloads({ frozen: true });
    return;
  }

  // ── stability while files change under the editor ────────────────────
  const persist = () => {
    saveSession(scene, { time, playing, slow: rate !== 1 });
  };
  window.addEventListener('pagehide', persist);
  guardReloads({
    hold: () => scrubbing || exporting,
    persist,
    onPending: () => toast('Updating…', 1200),
  });

  // A hidden tab gets no frames; resume from the same time, not a jump.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (playing) sound?.stop();
      return;
    }
    if (playing) syncOrigin();
  });

  // The waveform comes from the rendered mix; do it once the page is idle.
  if (sound && ui.wave) {
    const wave = ui.wave;
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 200));
    let buffer: AudioBuffer | null = null;
    let waveRaf = 0;
    const redraw = () => {
      if (!buffer || waveRaf) return;
      waveRaf = requestAnimationFrame(() => {
        waveRaf = 0;
        if (buffer) drawWave(wave, buffer, config.duration);
      });
    };
    idle(() => {
      void sound.render().then((mix) => {
        buffer = mix;
        redraw();
      });
    });
    new ResizeObserver(redraw).observe(wave);
  }

  const reloaded =
    (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)
      ?.type === 'reload';
  const saved = reloaded ? loadSession(scene) : null;

  if (reduce.matches) {
    showStill();
  } else if (saved) {
    if (saved.slow) toggleSlow();
    time = 0;
    rebuild();
    seekTo(saved.time);
    if (saved.playing) setPlaying(true);
    else paint();
  } else {
    playFromStart();
  }
}
