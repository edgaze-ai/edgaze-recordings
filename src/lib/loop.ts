import { Timeline, ease } from './timeline';

/**
 * Why: a real surface keeps its own idle motion. The checkout illustrations
 * breathe on CSS keyframes in the app, and a CSS animation cannot be seeked,
 * so the export would freeze them. This replays the same stops on the
 * storyboard clock — infinite iterations, per-segment ease — so a scrubbed
 * frame and an exported frame show the pack at the same breath.
 *
 * Starting at film time zero means the loop is already in its steady phase
 * by the time the surface is on screen, as it would be on a page that had
 * been open for a while.
 */
export function idleLoop(
  tl: Timeline,
  el: Element,
  {
    stops,
    duration,
    delay = 0,
  }: {
    /** [offset 0..1, opacity] pairs, as written in the component's keyframes. */
    stops: ReadonlyArray<readonly [number, number]>;
    duration: number;
    delay?: number;
  },
): void {
  tl.add(
    el,
    stops.map(([offset, opacity]) => ({ offset, opacity, easing: ease.travel })),
    { delay, duration, iterations: Infinity, easing: ease.linear, fill: 'both' },
  );
}
