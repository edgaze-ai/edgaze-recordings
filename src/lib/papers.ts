import { seeded } from './curve';
import { Timeline, ease } from './timeline';

/**
 * Primitives first written for the research spotlight (014): a storm of
 * paper, verdict stamps, a scan line that reads a table into being, lines
 * that draw themselves, and a face that changes on the beat. Transform and
 * opacity only, every one seekable.
 */

/**
 * Why: "thousands of papers" is a feeling of too much, not a number. Sheets
 * fall through the frame at three depths (near ones bigger, faster, blurrier
 * in motion), each turning as it drifts, from a fixed seed so every export is
 * the same storm.
 */
export function flurry(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    until,
    count = 60,
    seed = 7,
    width = 1080,
    height = 1920,
    fall = 2600,
  }: {
    at: number;
    until: number;
    count?: number;
    seed?: number;
    width?: number;
    height?: number;
    /** ms for a mid-depth sheet to cross the frame. */
    fall?: number;
  },
): HTMLElement[] {
  const rand = seeded(seed);
  const sheets: HTMLElement[] = [];
  for (let i = 0; i < count; i += 1) {
    const depth = rand(); // 0 far … 1 near
    const sheet = document.createElement('i');
    sheet.className = 'sheet';
    // Depth of field: the host's CSS softens the nearest and farthest layers.
    sheet.dataset.layer = depth > 0.78 ? 'near' : depth < 0.22 ? 'far' : 'mid';
    sheet.style.zIndex = String(Math.round(depth * 10));
    host.append(sheet);
    sheets.push(sheet);

    const scale = 0.45 + depth * 0.9;
    const x = rand() * width;
    const drift = (rand() - 0.5) * 300;
    const spin = (rand() - 0.5) * 200;
    const tilt = (rand() - 0.5) * 70;
    // A sheet of paper does not fall flat: it rocks on both axes as air
    // catches it. Seeded swing amplitudes, phase-shifted per sheet.
    const rx = 30 + rand() * 40;
    const ry = 15 + rand() * 30;
    const flip = rand() < 0.5 ? 1 : -1;
    const life = fall / (0.7 + depth * 0.7);
    const start = at + rand() * Math.max(0, until - at - life * 0.4);
    const pose = (p: number, swing: number) => {
      const y = -240 + (height + 480) * p;
      const dx = drift * p + Math.sin(p * Math.PI * 2.2) * 60 * flip;
      return `translate(${x + dx}px, ${y}px) rotate(${tilt + spin * p}deg) rotateX(${
        rx * swing
      }deg) rotateY(${ry * -swing * flip}deg) scale(${scale})`;
    };
    const op = 0.35 + depth * 0.65;
    tl.add(
      sheet,
      [
        { transform: pose(0, -1), opacity: 0, offset: 0 },
        { opacity: op, offset: 0.1 },
        { transform: pose(0.33, 1), offset: 0.33 },
        { transform: pose(0.66, -0.8), offset: 0.66 },
        { opacity: op, offset: 0.86 },
        { transform: pose(1, 0.7), opacity: 0, offset: 1 },
      ],
      { delay: start, duration: life, easing: ease.linear, fill: 'both' },
    );
  }
  return sheets;
}

/**
 * Why: a verdict should land like a rubber stamp, not fade in: big and
 * tilted in front of the lens, then down hard with a small bounce.
 */
export function stamp(
  tl: Timeline,
  els: Element[],
  {
    at,
    step = 120,
    duration = 520,
    tilt = -10,
  }: {
    at: number;
    step?: number;
    duration?: number;
    tilt?: number;
  },
): void {
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: `scale(2.4) rotate(${tilt * 2}deg)`, opacity: 0 },
        { transform: `scale(0.88) rotate(${tilt}deg)`, opacity: 1, offset: 0.55 },
        { transform: `scale(1.04) rotate(${tilt}deg)`, opacity: 1, offset: 0.78 },
        { transform: `scale(1) rotate(${tilt}deg)`, opacity: 1 },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'both' },
    );
  });
}

/**
 * Why: a table that fades in reads as a screenshot; one that is read into
 * being by a scan line reads as work being done. The line travels down the
 * block at a steady pace; each row rises into place the moment the line
 * reaches it. Row positions are measured at rest.
 */
export function scanReveal(
  tl: Timeline,
  line: HTMLElement,
  rows: HTMLElement[],
  { at, duration, lead = 60 }: { at: number; duration: number; lead?: number },
): number {
  const block = line.offsetParent as HTMLElement | null;
  const height = block?.offsetHeight ?? 0;
  tl.add(
    line,
    [
      { transform: 'translateY(0px)', opacity: 0 },
      { opacity: 1, offset: 0.06 },
      { opacity: 1, offset: 0.94 },
      { transform: `translateY(${height}px)`, opacity: 0 },
    ],
    { delay: at, duration, easing: ease.linear, fill: 'both' },
  );
  rows.forEach((row) => {
    const top = row.offsetTop;
    const reach = at + (height ? (top / height) * duration : 0) - lead;
    tl.add(
      row,
      [
        { transform: 'translateY(18px)', opacity: 0 },
        { transform: 'translateY(0px)', opacity: 1 },
      ],
      { delay: reach, duration: 520, easing: ease.expo, fill: 'both' },
    );
  });
  return at + duration;
}

/**
 * Why: a connector that appears whole is a slide; one that draws itself
 * shows the flow. Scales from zero along one axis; set transform-origin in
 * CSS to where the line starts.
 */
export function grow(
  tl: Timeline,
  els: Element[],
  {
    at,
    axis = 'y',
    step = 0,
    duration = 600,
  }: { at: number; axis?: 'x' | 'y'; step?: number; duration?: number },
): void {
  const from = axis === 'x' ? 'scaleX(0)' : 'scaleY(0)';
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: from, opacity: 1 },
        { transform: 'scale(1, 1)', opacity: 1 },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'both' },
    );
  });
}

/**
 * Why: a character's reaction has to happen on a frame, like a cut in
 * animation: the old face is gone and the new one pops a touch too big
 * and settles. Both faces are stacked in place; `from` must be visible.
 */
export function swap(
  tl: Timeline,
  from: Element,
  to: Element,
  { at, duration = 420 }: { at: number; duration?: number },
): void {
  tl.add(from, [{ opacity: 1 }, { opacity: 0 }], {
    delay: at,
    duration: 1,
    easing: ease.linear,
    fill: 'forwards',
  });
  tl.add(
    to,
    [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1.08)', opacity: 1, offset: 0.4 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'both' },
  );
}
