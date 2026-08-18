import { emit } from './burst';
import { Timeline, ease } from './timeline';

/**
 * Why: a lockup that just appears is a slide. The blade has to travel,
 * leave a trail, and throw sparks — then the row is a result, not a layout.
 * Expo on one long hop dumps the motion up front and the ghosts become
 * columns. Short hops keep the house curve without losing the sweep.
 */
export function sweepAcross(
  tl: Timeline,
  field: HTMLElement,
  {
    at,
    duration = 1200,
    fromX = -300,
    toX = 2220,
    hops = 7,
  }: {
    at: number;
    duration?: number;
    fromX?: number;
    toX?: number;
    hops?: number;
  },
): void {
  const blade = field.querySelector<HTMLElement>('.sweep');
  const trail = field.querySelector<HTMLElement>('.sweep-trail');
  const burst = field.querySelector<HTMLElement>('.sweep-burst');
  if (!blade || !trail) return;

  const seg = duration / hops;
  const step = (toX - fromX) / hops;
  const xAt = (i: number) => fromX + step * i;

  const ride = (el: HTMLElement, opacity: number, delay: number, fade: boolean): void => {
    for (let i = 0; i < hops; i += 1) {
      const from = xAt(i);
      const to = xAt(i + 1);
      const first = i === 0;
      const last = i === hops - 1;
      const frames: Keyframe[] = fade
        ? first
          ? [
              { transform: `translateX(${from}px)`, opacity: 0 },
              { transform: `translateX(${from + 36}px)`, opacity, offset: 0.22 },
              { transform: `translateX(${to}px)`, opacity },
            ]
          : last
            ? [
                { transform: `translateX(${from}px)`, opacity },
                { transform: `translateX(${to - 36}px)`, opacity, offset: 0.78 },
                { transform: `translateX(${to}px)`, opacity: 0 },
              ]
            : [
                { transform: `translateX(${from}px)`, opacity },
                { transform: `translateX(${to}px)`, opacity },
              ]
        : [{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }];
      tl.add(el, frames, {
        delay: delay + i * seg,
        duration: seg,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
  };

  ride(blade, 1, at, true);

  trail.replaceChildren();
  for (let i = 0; i < 8; i += 1) {
    const ghost = document.createElement('i');
    ghost.className = 'sweep-ghost';
    trail.append(ghost);
    ride(ghost, 1 - i / 8, at + i * 22, true);
  }

  if (burst) {
    ride(burst, 1, at, false);
    emit(tl, burst, { at: at + 80, count: 10, duration: 720, radius: 160 });
  }
}
