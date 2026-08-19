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
 * Why: a click that only scales is a toggle. The disc compresses, then
 * eight expanding copies 22ms apart are the impact — fake motion blur.
 */
export function press(
  tl: Timeline,
  el: Element,
  { at, duration = 380 }: { at: number; duration?: number },
): void {
  tl.add(
    el,
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.84)', offset: 0.28 },
      { transform: 'scale(1.08)', offset: 0.62 },
      { transform: 'scale(1)' },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

export function pressBurst(
  tl: Timeline,
  host: HTMLElement,
  { at, count = 8, gap = 22 }: { at: number; count?: number; gap?: number },
): void {
  host.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const ghost = document.createElement('i');
    host.append(ghost);
    const peak = 0.52 * (1 - i / count);
    tl.add(
      ghost,
      [
        { transform: 'scale(1)', opacity: 0 },
        { transform: 'scale(1)', opacity: peak, offset: 0.14 },
        { transform: `scale(${1.7 + i * 0.16})`, opacity: 0 },
      ],
      { delay: at + i * gap, duration: 440, easing: ease.expo, fill: 'forwards' },
    );
  }
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

/**
 * Why: a hard cut into the product is a slide. Flying through a word
 * needs a tunnel — eight rings, each with eight ghosts 22ms apart, plus
 * gradient rays — so the rush reads as speed, not a scale tween.
 */
function rushMark(host: HTMLElement): void {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.innerHTML =
    '<defs><linearGradient id="rush-grad" x1="0" y1="0" x2="1" y2="0">' +
    '<stop offset="0" stop-color="var(--cyan)"/>' +
    '<stop offset="0.54" stop-color="var(--accent-mid)"/>' +
    '<stop offset="1" stop-color="var(--pink)"/>' +
    '</linearGradient></defs>';
  host.append(svg);
}

function rushRing(): HTMLElement {
  const ghost = document.createElement('b');
  ghost.innerHTML =
    '<svg viewBox="0 0 240 240" aria-hidden="true">' +
    '<circle cx="120" cy="120" r="117" fill="none" stroke="url(#rush-grad)" stroke-width="6"/>' +
    '</svg>';
  return ghost;
}

export function tunnel(
  tl: Timeline,
  host: HTMLElement,
  { at, rings = 8, rays = 8 }: { at: number; rings?: number; rays?: number },
): void {
  host.replaceChildren();
  rushMark(host);
  const ghosts = 8;
  const gap = 22;

  for (let r = 0; r < rings; r += 1) {
    const wrap = document.createElement('i');
    wrap.className = 'rush-ring';
    host.append(wrap);
    const start = 0.16 + r * 0.05;
    const end = 13 + r * 0.7;
    for (let g = 0; g < ghosts; g += 1) {
      const ghost = rushRing();
      wrap.append(ghost);
      const peak = 0.72 * (1 - g / ghosts);
      tl.add(
        ghost,
        [
          { transform: `translate(-50%, -50%) scale(${start})`, opacity: 0 },
          {
            transform: `translate(-50%, -50%) scale(${start * 1.35})`,
            opacity: peak,
            offset: 0.1,
          },
          { transform: `translate(-50%, -50%) scale(${end})`, opacity: 0 },
        ],
        {
          delay: at + r * 60 + g * gap,
          duration: 980,
          easing: ease.expo,
          fill: 'forwards',
        },
      );
    }
  }

  for (let i = 0; i < rays; i += 1) {
    const wrap = document.createElement('i');
    wrap.className = 'rush-ray';
    host.append(wrap);
    const rot = (i / rays) * 180;
    for (let g = 0; g < ghosts; g += 1) {
      const ghost = document.createElement('b');
      wrap.append(ghost);
      const peak = 0.55 * (1 - g / ghosts);
      tl.add(
        ghost,
        [
          {
            transform: `translate(-50%, -50%) rotate(${rot}deg) scaleY(0.12)`,
            opacity: 0,
          },
          {
            transform: `translate(-50%, -50%) rotate(${rot}deg) scaleY(0.55)`,
            opacity: peak,
            offset: 0.16,
          },
          {
            transform: `translate(-50%, -50%) rotate(${rot}deg) scaleY(2.4)`,
            opacity: 0,
          },
        ],
        {
          delay: at + 80 + i * 60 + g * gap,
          duration: 860,
          easing: ease.expo,
          fill: 'forwards',
        },
      );
    }
  }
}
