import { requestExport } from './export';
import { prepare } from './reveal';
import { type ClipFormat } from './scene-meta';
import { Timeline } from './timeline';

/**
 * Why: preview and record are different jobs. Preview must fit a laptop
 * display; record must still yield at least `width` real pixels on retina,
 * then loop so the operator can roll without reloading.
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

  const replay = document.querySelector('#replay');
  const slow = document.querySelector('#slow');
  const rec = document.querySelector('#rec');
  const exportMp4 = document.querySelector('#export-mp4');
  const exportMov = document.querySelector('#export-mov');
  const status = document.querySelector('#status');
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
  let loopId = 0;
  let exporting = false;

  stage.style.width = `${config.width}px`;
  stage.style.height = `${config.height}px`;
  prepare(document);
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
    const dpr = window.devicePixelRatio || 1;
    const pad = recording ? 0 : 96;
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

  const reset = () => {
    stage.querySelectorAll('.on').forEach((el) => el.classList.remove('on'));
    stage.querySelector('.trail-host')?.replaceChildren();
  };

  const play = () => {
    window.clearTimeout(loopId);
    tl?.clear();
    reset();
    tl = new Timeline(rate);
    config.build(tl, stage);
    loopId = window.setTimeout(play, (config.duration + 700) / rate);
  };

  const playOnce = () =>
    new Promise<void>((resolve) => {
      window.clearTimeout(loopId);
      tl?.clear();
      reset();
      tl = new Timeline(1);
      config.build(tl, stage);
      loopId = window.setTimeout(() => resolve(), config.duration + 400);
    });

  const showStill = () => {
    window.clearTimeout(loopId);
    tl?.clear();
    reset();
    config.still?.(stage);
  };

  const runExport = async (format: ClipFormat) => {
    if (exporting) return;
    exporting = true;
    document.body.classList.add('busy');
    try {
      await requestExport(format, {
        scene,
        stage,
        duration: config.duration,
        playOnce,
        setRecording,
        onStatus: statusText,
      });
    } catch (error) {
      statusText(error instanceof Error ? error.message : 'Export failed');
    } finally {
      exporting = false;
      document.body.classList.remove('busy');
      if (!reduce.matches && autoExport !== '1') play();
    }
  };

  replay?.addEventListener('click', () => {
    if (reduce.matches) showStill();
    else play();
  });

  slow?.addEventListener('click', () => {
    rate = rate === 1 ? 0.25 : 1;
    slow.classList.toggle('on', rate !== 1);
    if (!reduce.matches) play();
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

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !recording || exporting) return;
    setRecording(false);
  });

  window.addEventListener('resize', fit);
  fit();

  window.__edgazeExport = {
    width: config.width,
    height: config.height,
    duration: config.duration,
  };
  window.__edgazeStart = () =>
    playOnce().then(() => {
      window.__edgazeDone = true;
    });

  if (autoExport === '1') {
    return;
  }

  if (reduce.matches) showStill();
  else play();
}
