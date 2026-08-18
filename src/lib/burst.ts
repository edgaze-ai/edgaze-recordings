import { Timeline, ease } from './timeline';

/**
 * Why: a model swap needs a beat, not a dissolve. The flare is the
 * gradient event — one unit in and out so the ramp never splits.
 */
export function bloom(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 720 }: { at: number; duration?: number },
): void {
  tl.add(
    el,
    [
      { transform: 'scale(0.42)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 0.92, offset: 0.32 },
      { transform: 'scale(1.62)', opacity: 0 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

/**
 * Why: a glow that dies on the cut is a blink. Same ellipse from the
 * first frame — it arrives, spreads, and stays while the camera moves.
 */
export function aura(
  tl: Timeline,
  el: HTMLElement,
  {
    at,
    duration,
    peak = 0.28,
    from = 0.8,
    to = 6,
  }: {
    at: number;
    duration: number;
    peak?: number;
    from?: number;
    to?: number;
  },
): void {
  el.replaceChildren();
  for (let i = 0; i < 2; i += 1) {
    const bar = document.createElement('i');
    bar.dataset.ring = String(i);
    el.append(bar);
  }
  tl.add(
    el,
    [
      { transform: `scale(${from})`, opacity: 0 },
      { transform: `scale(${to})`, opacity: peak },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

/**
 * Why: sparks have to leave the mark. Staggered emit reads as a burst
 * instead of a ring appearing at once.
 */
export function emit(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    count = 8,
    duration = 680,
    radius = 78,
  }: {
    at: number;
    count?: number;
    duration?: number;
    radius?: number;
  },
): void {
  host.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const spark = document.createElement('i');
    spark.dataset.tone = i % 2 === 0 ? 'c' : 'p';
    host.append(spark);
    const reach = radius + (i % 3) * 12;
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2 + (i % 2 === 0 ? -0.14 : 0.16);
    const x = Math.cos(angle) * reach;
    const y = Math.sin(angle) * reach;
    tl.add(
      spark,
      [
        { transform: 'scale(0.3)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 0.2 },
        { transform: `translate(${x}px, ${y}px) scale(0.42)`, opacity: 0 },
      ],
      {
        delay: at + i * 55,
        duration,
        easing: ease.expo,
        fill: 'forwards',
      },
    );
  }
}
