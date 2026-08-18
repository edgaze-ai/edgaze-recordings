import { Timeline, ease } from './timeline';

export type MarkPose = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

function pose(p: MarkPose): { transform: string; opacity: number } {
  return {
    transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
    opacity: p.opacity,
  };
}

/**
 * Why: provider marks should hang in space, not orbit. They pop in where
 * they sit, travel, then snap to the row — never ease in from offscreen.
 */
export function suspendMarks(
  tl: Timeline,
  marks: HTMLElement[],
  {
    at,
    duration,
    start,
    wander,
    drift,
    settle,
    settleAt,
    settleStep = 160,
  }: {
    at: number;
    duration: number;
    start: MarkPose[];
    wander?: MarkPose[];
    drift: MarkPose[];
    settle: MarkPose[];
    settleAt?: number;
    settleStep?: number;
  },
): void {
  marks.forEach((el, i) => {
    const a = start[i];
    const mid = wander?.[i];
    const b = drift[i];
    const c = settle[i];
    if (!a || !b || !c) return;
    const startAt = at + i * 55;
    const fade = 180;
    const settleFor = 380;
    const snapAt =
      settleAt === undefined
        ? startAt + fade + Math.max(480, duration - fade - settleFor)
        : settleAt + i * settleStep;
    const driftFor = Math.max(400, snapAt - startAt - fade);
    tl.add(el, [{ ...pose(a), opacity: 0 }, pose(a)], {
      delay: startAt,
      duration: fade,
      easing: ease.expo,
      fill: 'forwards',
    });
    if (mid) {
      const first = Math.floor(driftFor * 0.48);
      tl.add(el, [pose(a), pose(mid)], {
        delay: startAt + fade,
        duration: first,
        easing: ease.expo,
        fill: 'forwards',
      });
      tl.add(el, [pose(mid), pose(b)], {
        delay: startAt + fade + first,
        duration: driftFor - first,
        easing: ease.expo,
        fill: 'forwards',
      });
    } else {
      tl.add(el, [pose(a), pose(b)], {
        delay: startAt + fade,
        duration: driftFor,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
    const hit = pose({ ...c, scale: c.scale * 1.08 });
    tl.add(el, [pose(b), hit], {
      delay: snapAt,
      duration: settleFor,
      easing: ease.expo,
      fill: 'forwards',
    });
    tl.add(el, [hit, pose(c)], {
      delay: snapAt + settleFor,
      duration: 220,
      easing: ease.expo,
      fill: 'forwards',
    });
  });
}

/**
 * Why: the model on a step should arrive after the node, as a resolve, not
 * as part of the box appearing.
 */
export function resolveHint(
  tl: Timeline,
  els: HTMLElement[],
  { at, duration = 220 }: { at: number; duration?: number },
): void {
  els.forEach((el) => {
    tl.add(
      el,
      [
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { delay: at, duration, easing: ease.expo, fill: 'both' },
    );
  });
}
