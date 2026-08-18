import { Timeline, ease } from './timeline';

/**
 * Why: a locked frame reads as a slide. The 3.2% linear push over the full
 * duration is the difference between a graphic and a shot.
 */
export function cameraPush(
  tl: Timeline,
  el: Element,
  { duration, from = 1, to = 1.032 }: { duration: number; from?: number; to?: number },
): void {
  tl.add(el, [{ transform: `scale(${from})` }, { transform: `scale(${to})` }], {
    duration,
    easing: ease.linear,
    fill: 'both',
  });
}

/**
 * Why: blooms that sit still look pasted. A slow drift keeps the atmosphere
 * alive without competing with the action.
 */
export function drift(
  tl: Timeline,
  el: Element,
  { duration, dx, dy }: { duration: number; dx: number; dy: number },
): void {
  tl.add(
    el,
    [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${dx}px, ${dy}px)` }],
    {
      duration,
      easing: ease.travel,
      fill: 'both',
    },
  );
}
