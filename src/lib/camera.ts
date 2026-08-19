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
  { at = 0, duration, dx, dy }: { at?: number; duration: number; dx: number; dy: number },
): void {
  tl.add(
    el,
    [{ transform: 'translate(0px, 0px)' }, { transform: `translate(${dx}px, ${dy}px)` }],
    {
      delay: at,
      duration,
      easing: ease.travel,
      fill: 'both',
    },
  );
}

/**
 * Why: a locked wash is a sticker. Scale plus opacity over a long hold
 * is the room breathing — never a property other than those two.
 */
export function breathe(
  tl: Timeline,
  el: Element,
  {
    at,
    duration,
    from = 0.96,
    mid = 1.08,
    to = 1.02,
    peak = 0.42,
    rest = 0.3,
    fadeFrom = 0,
    dx = 0,
    dy = 0,
  }: {
    at: number;
    duration: number;
    from?: number;
    mid?: number;
    to?: number;
    peak?: number;
    rest?: number;
    fadeFrom?: number;
    dx?: number;
    dy?: number;
  },
): void {
  tl.add(
    el,
    [
      { transform: `translate(0px, 0px) scale(${from})`, opacity: fadeFrom },
      {
        transform: `translate(${dx * 0.55}px, ${dy * 0.4}px) scale(${mid})`,
        opacity: peak,
        offset: 0.42,
      },
      { transform: `translate(${dx}px, ${dy}px) scale(${to})`, opacity: rest },
    ],
    { delay: at, duration, easing: ease.travel, fill: 'forwards' },
  );
}

/**
 * Why: a locked graph is a diagram. Punch in, then travel — expo so
 * the move snaps off the mark and settles on the last node.
 */
export function track(
  tl: Timeline,
  el: Element,
  {
    at,
    duration,
    fromX,
    toX,
    fromY = 0,
    toY = 0,
    from = 1,
    to = 1,
  }: {
    at: number;
    duration: number;
    fromX: number;
    toX: number;
    fromY?: number;
    toY?: number;
    from?: number;
    to?: number;
  },
): void {
  tl.add(
    el,
    [
      { transform: `scale(${from}) translate(${fromX}px, ${fromY}px)` },
      { transform: `scale(${to}) translate(${toX}px, ${toY}px)` },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

export type Pose3 = {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  s?: number;
  sx?: number;
  sy?: number;
  o?: number;
};

function pose3(p: Pose3): { transform: string; opacity: number } {
  const x = p.x ?? 0;
  const y = p.y ?? 0;
  const z = p.z ?? 0;
  const rx = p.rx ?? 0;
  const ry = p.ry ?? 0;
  const sx = p.sx ?? p.s ?? 1;
  const sy = p.sy ?? p.s ?? 1;
  return {
    transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${sx}, ${sy})`,
    opacity: p.o ?? 1,
  };
}

/**
 * Why: a flat studio is a screenshot. Slow travel in perspective is a
 * product shot — the UI stays readable, the space does the work.
 */
export function travel3d(
  tl: Timeline,
  el: HTMLElement,
  { at, duration, from, to }: { at: number; duration: number; from: Pose3; to: Pose3 },
): void {
  tl.add(el, [pose3(from), pose3(to)], {
    delay: at,
    duration,
    easing: ease.expo,
    fill: 'forwards',
  });
}
