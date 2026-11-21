import { Timeline, ease } from './timeline';

/**
 * Parked bands sit this far off-frame (in % of the frame) so the soft edge
 * shadow on each band never bleeds into the picture while it waits.
 */
const OFF = 125;

export type WipeFrom = 'left' | 'right' | 'top' | 'bottom';

const AXIS: Record<WipeFrom, { prop: 'X' | 'Y'; sign: 1 | -1 }> = {
  left: { prop: 'X', sign: -1 },
  right: { prop: 'X', sign: 1 },
  top: { prop: 'Y', sign: -1 },
  bottom: { prop: 'Y', sign: 1 },
};

/**
 * Why: a launch film changes picture with colour, not with a dissolve. A
 * stack of full-frame bands slides across, each one a beat behind the last,
 * so the eye reads a sweep of colour rather than a layer switching. The last
 * band fully covers the frame at the returned time — cut the screens under
 * it on that exact millisecond, then the bands carry on and leave.
 *
 * Bands are CSS colour tokens, e.g. ['--cat-sales', '--ink-display'].
 * Only transform animates; the bands are created inside `host`, which should
 * be an absolutely positioned layer above the screens and below the grain.
 * Returns the cover time.
 */
export function colorWipe(
  tl: Timeline,
  host: HTMLElement,
  {
    at: startAt,
    cover: coverAt,
    colors,
    from = 'left',
    step = 70,
    travel = 440,
    hold = 40,
    exit = 520,
  }: {
    /** When the first band starts. Give this or `cover`. */
    at?: number;
    /** When the frame must be fully covered — put this on a beat. */
    cover?: number;
    colors: string[];
    from?: WipeFrom;
    step?: number;
    travel?: number;
    hold?: number;
    exit?: number;
  },
): number {
  const lead = (colors.length - 1) * step + travel;
  const at = startAt ?? (coverAt ?? 0) - lead;
  const { prop, sign } = AXIS[from];
  const start = `translate${prop}(${sign * OFF}%)`;
  const mid = `translate${prop}(0%)`;
  const end = `translate${prop}(${sign * -OFF}%)`;
  const cover = at + lead;

  colors.forEach((color, i) => {
    const band = document.createElement('i');
    band.className = 'wipe-band';
    band.style.background = `var(${color})`;
    band.style.zIndex = String(i + 1);
    host.append(band);

    const enter = at + i * step;
    tl.add(band, [{ transform: start }, { transform: mid }], {
      delay: enter,
      duration: travel,
      easing: ease.travel,
      fill: 'both',
    });
    // Bands leave in the order they arrived, after the last has covered,
    // so the incoming screen is revealed by the same sweep direction.
    tl.add(band, [{ transform: mid }, { transform: end }], {
      delay: cover + hold + i * step,
      duration: exit,
      easing: ease.expo,
      fill: 'forwards',
    });
  });

  return cover;
}

/**
 * Why: two screens must swap ownership on one frame while a wipe covers
 * them. `screen` is shown at `at` and hidden at `until`, nothing else; a
 * fade here would show through the wipe band's leading edge.
 */
export function holdScreen(
  tl: Timeline,
  screen: HTMLElement,
  { at, until }: { at: number; until?: number },
): void {
  tl.add(screen, [{ opacity: 0 }, { opacity: 1 }], {
    delay: at,
    duration: 1,
    easing: ease.expo,
    fill: 'both',
  });
  if (until === undefined) return;
  tl.add(screen, [{ opacity: 1 }, { opacity: 0 }], {
    delay: until,
    duration: 1,
    easing: ease.expo,
    fill: 'forwards',
  });
}

/**
 * Why: a sweep says "next slide"; an iris says "look here". Concentric
 * discs of colour burst out of one point, each a beat behind the last, and
 * the final disc — the incoming screen's ground — covers the frame on
 * `cover`. Cut the screens under it on that millisecond; the discs vanish a
 * moment later and, because the last one matches the new ground, nothing
 * visibly changes. It echoes the rings in the opening "o".
 *
 * `x`/`y` are in stage px. Only transform and opacity animate.
 */
export function irisWipe(
  tl: Timeline,
  host: HTMLElement,
  {
    cover,
    x,
    y,
    colors,
    step = 80,
    travel = 560,
    width = 1920,
    height = 1080,
  }: {
    cover: number;
    x: number;
    y: number;
    colors: string[];
    step?: number;
    travel?: number;
    width?: number;
    height?: number;
  },
): number {
  // Far enough to reach the farthest corner from (x, y).
  const r = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 40;
  const at = cover - (colors.length - 1) * step - travel;
  colors.forEach((color, i) => {
    const disc = document.createElement('i');
    disc.className = 'iris';
    disc.style.background = `var(${color})`;
    disc.style.zIndex = String(i + 1);
    disc.style.left = `${x - r}px`;
    disc.style.top = `${y - r}px`;
    disc.style.width = `${r * 2}px`;
    disc.style.height = `${r * 2}px`;
    host.append(disc);
    tl.add(
      disc,
      [
        { transform: 'scale(0)', opacity: 1 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: at + i * step, duration: travel, easing: ease.travel, fill: 'both' },
    );
    // Gone a frame after the cut: the new screen is already underneath.
    tl.add(disc, [{ opacity: 1 }, { opacity: 0 }], {
      delay: cover + 30,
      duration: 1,
      easing: ease.expo,
      fill: 'forwards',
    });
  });
  return cover;
}
