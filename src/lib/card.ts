import { Timeline, ease } from './timeline';

/**
 * Why: an announcement card fades up from just under size and then keeps
 * creeping until the cut takes it off. A card that lands and stops is a
 * slide. The creep is linear for the same reason the camera push is: it is
 * the lens, not the type, that is moving.
 */
export function cardIn(
  tl: Timeline,
  el: HTMLElement,
  {
    at,
    hold,
    duration = 600,
    from = 0.985,
    creep = 1.012,
    follow,
  }: {
    at: number;
    hold: number;
    duration?: number;
    from?: number;
    creep?: number;
    /**
     * A layer that must scale with the line but not fade with it — the
     * multiplied light strip. Fading or scaling them as one group would
     * isolate the blend and show the strip's box; moving them in lockstep
     * as siblings keeps the blend against the black screen behind.
     */
    follow?: HTMLElement;
  },
): void {
  tl.add(
    el,
    [
      { transform: `scale(${from})`, opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
  if (follow) {
    tl.add(follow, [{ transform: `scale(${from})` }, { transform: 'scale(1)' }], {
      delay: at,
      duration,
      easing: ease.expo,
      fill: 'forwards',
    });
  }
  for (const layer of follow ? [el, follow] : [el]) {
    tl.add(layer, [{ transform: 'scale(1)' }, { transform: `scale(${creep})` }], {
      delay: at + duration,
      duration: Math.max(200, hold - duration),
      easing: ease.linear,
      fill: 'forwards',
    });
  }
}

/**
 * Why: the gradient in the type is light crossing a surface, so it has to
 * behave like light — one slow, even pass that never stops and never comes
 * back. The strip is two periods wide and its phase is a function of film
 * time, not card time, so consecutive cards read as the same light still
 * travelling, and no single card runs long enough to see it wrap.
 *
 * Linear on purpose: an eased light speeds up and slows down, and that
 * reads as a pulse — the one thing the brief rules out.
 */
export function flowLight(
  tl: Timeline,
  strip: HTMLElement,
  {
    at,
    duration,
    rate = 0.0021,
  }: {
    at: number;
    duration: number;
    /** Share of one period travelled per millisecond of film time, in %. */
    rate?: number;
  },
): void {
  const period = 50;
  const start = (at * rate) % period;
  const end = start + duration * rate;
  tl.add(
    strip,
    [
      { transform: `translate3d(${-start.toFixed(3)}%, 0, 0)` },
      { transform: `translate3d(${-end.toFixed(3)}%, 0, 0)` },
    ],
    { delay: at, duration, easing: ease.linear, fill: 'both' },
  );
}
