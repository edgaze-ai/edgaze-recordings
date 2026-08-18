import { prepare } from './reveal';
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
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  let rate = 1;
  let recording = false;
  let tl: Timeline | null = null;
  let loopId = 0;

  stage.style.width = `${config.width}px`;
  stage.style.height = `${config.height}px`;
  prepare(document);

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

  const showStill = () => {
    window.clearTimeout(loopId);
    tl?.clear();
    reset();
    config.still?.(stage);
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
    recording = !recording;
    document.body.classList.toggle('rec', recording);
    rec.classList.toggle('on', recording);
    fit();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !recording) return;
    recording = false;
    document.body.classList.remove('rec');
    rec?.classList.remove('on');
    fit();
  });

  window.addEventListener('resize', fit);
  fit();

  if (reduce.matches) showStill();
  else play();
}
