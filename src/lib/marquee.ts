import { Timeline } from './timeline';

/**
 * Why: a gallery that eases to a stop reads as a slide, and a belt you can
 * see the end of reads as a finite list. marquee() copies the row so it is
 * always longer than the frame, then scrolls it at a constant speed and
 * wraps by exactly one copy's width, so it never slows, never ends and
 * never shows a seam. Driven from the timeline, so scrub and export match.
 */
export function marquee(
  tl: Timeline,
  row: HTMLElement,
  {
    at,
    speed = 260,
    copies = 3,
  }: {
    /** Scene time the scroll starts. */
    at: number;
    /** Pixels per second, leftward. */
    speed?: number;
    /** Copies of the original children, including the original. */
    copies?: number;
  },
): HTMLElement[] {
  const originals = [...row.children] as HTMLElement[];
  // One copy's width, measured before cloning: first child to the next copy.
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const period = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
  for (let c = 1; c < copies; c += 1) {
    originals.forEach((el) => row.append(el.cloneNode(true)));
  }
  // The row is centred by its screen, so with three copies a full copy of
  // runway sits off each edge and the wrap below always stays covered.

  tl.raf((t) => {
    const travelled = (Math.max(0, t - at) * speed) / 1000;
    row.style.transform = `translateX(${-(travelled % period)}px)`;
    return true;
  });
  return [...row.children] as HTMLElement[];
}
