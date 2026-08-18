import { reveal } from './reveal';
import { Timeline, ease } from './timeline';

/**
 * Why: a still dropped on the stage must arrive the same way type does —
 * clipped, not faded — or it reads as a slide. Video starts when the
 * plate lands so the first frame is not a random mid-loop cut.
 */
export function plateIn(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 900, play = true }: { at: number; duration?: number; play?: boolean },
): void {
  const inner = el.querySelector<HTMLElement>(':scope > i') ?? el;
  reveal(tl, [inner], { at, duration, step: 0 });
  const video = el.querySelector('video');
  if (play && video) {
    tl.at(at, () => {
      video.currentTime = 0;
      void video.play();
    });
  }
}

export function plateOut(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 700 }: { at: number; duration?: number },
): void {
  const inner = el.querySelector<HTMLElement>(':scope > i') ?? el;
  tl.add(inner, [{ transform: 'translateY(0)' }, { transform: 'translateY(-115%)' }], {
    duration,
    delay: at,
    easing: ease.expo,
    fill: 'both',
  });
  const video = el.querySelector('video');
  if (video) {
    tl.at(at + duration, () => {
      video.pause();
    });
  }
}
