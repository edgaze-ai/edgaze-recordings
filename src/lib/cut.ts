import { Timeline, ease } from './timeline';

/**
 * Why: cards and motion never share a frame. A 1ms cut is a cut, not a
 * dissolve — two screens swap ownership of the stage on the same beat.
 * fill is forwards, never both: backwards fill would light every later
 * card from t=0 and stack the lines.
 */
export function hardCut(tl: Timeline, from: HTMLElement, to: HTMLElement, at: number): void {
  tl.add(from, [{ opacity: 1 }, { opacity: 0 }], {
    delay: at,
    duration: 1,
    easing: ease.expo,
    fill: 'forwards',
  });
  tl.add(to, [{ opacity: 0 }, { opacity: 1 }], {
    delay: at,
    duration: 1,
    easing: ease.expo,
    fill: 'forwards',
  });
}

/**
 * Why: the film's transition between two pictures is a dip, not a wipe.
 * The outgoing shot eases away — a touch of push with the fade, so it
 * reads as the lens leaving rather than a layer switching off — and the
 * incoming shot settles in with `land`. Black holds for a beat between.
 */
export function fadeOut(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 420, to = 1.02 }: { at: number; duration?: number; to?: number },
): void {
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: `scale(${to})`, opacity: 0 },
    ],
    { delay: at, duration, easing: ease.quint, fill: 'forwards' },
  );
}

/**
 * Why: a model swap that pops reads as an error. Crossfade the label only
 * so the node keeps running through the change.
 */
export function crossfade(
  tl: Timeline,
  from: HTMLElement,
  to: HTMLElement,
  { at, duration = 280 }: { at: number; duration?: number },
): void {
  tl.add(
    from,
    [
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-10px)' },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
  tl.add(
    to,
    [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}
