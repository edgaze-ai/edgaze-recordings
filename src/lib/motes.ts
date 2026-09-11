import { Timeline, ease } from './timeline';

/**
 * Why: Math.random would make two exports of the same scene different files.
 * A 32-bit LCG off a named seed gives the same field every render.
 */
function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Why: a captured plate under a moving camera still reads as a screenshot.
 * A slow field of motes puts light in the air over the UI without touching
 * it — transform and opacity only, so the frame budget stays free for the
 * camera.
 */
export function motes(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    duration,
    count = 20,
    seed = 7,
    width = 1920,
    height = 1080,
    rise = 200,
    peak = 0.6,
  }: {
    at: number;
    duration: number;
    count?: number;
    seed?: number;
    width?: number;
    height?: number;
    rise?: number;
    peak?: number;
  },
): void {
  host.replaceChildren();
  const next = rand(seed);
  for (let i = 0; i < count; i += 1) {
    const dot = document.createElement('i');
    dot.dataset.tone = i % 3 === 0 ? 'p' : 'c';
    const size = 2 + next() * 3.2;
    dot.style.left = `${(next() * width).toFixed(1)}px`;
    dot.style.top = `${(next() * height).toFixed(1)}px`;
    dot.style.width = `${size.toFixed(2)}px`;
    dot.style.height = `${size.toFixed(2)}px`;
    host.append(dot);
    const dx = (next() - 0.5) * rise * 0.7;
    const dy = -rise * (0.45 + next() * 0.85);
    const life = duration * (0.6 + next() * 0.4);
    const start = at + next() * duration * 0.55;
    const bright = peak * (0.4 + next() * 0.6);
    tl.add(
      dot,
      [
        { transform: 'translate3d(0, 0, 0) scale(0.4)', opacity: 0 },
        {
          transform: `translate3d(${(dx * 0.42).toFixed(1)}px, ${(dy * 0.42).toFixed(1)}px, 0) scale(1)`,
          opacity: bright,
          offset: 0.36,
        },
        {
          transform: `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(0.55)`,
          opacity: 0,
        },
      ],
      { delay: start, duration: life, easing: ease.travel, fill: 'forwards' },
    );
  }
}
