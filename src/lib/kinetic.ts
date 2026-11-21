import { Timeline, ease } from './timeline';

/**
 * Why: big launch type should arrive with weight. A plain clip-up at 260px
 * reads as a slide; tipping each word a few degrees inside its mask and
 * letting it settle flat is what makes it feel thrown onto the beat. Still
 * clip, never fade — the mask is the .m > i pair from prepare().
 */
export function slam(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    step = 110,
    duration = 760,
    tilt = 5,
  }: { at: number; step?: number; duration?: number; tilt?: number },
): void {
  els.forEach((el, i) => {
    el.style.transformOrigin = '0% 100%';
    tl.add(
      el,
      [
        { transform: `translateY(112%) rotate(${tilt}deg)` },
        { transform: 'translateY(0%) rotate(0deg)' },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'both' },
    );
  });
}

/**
 * Why: a montage at 8th-note speed is a sequence of hard cuts, not a
 * sequence of transitions. Each layer owns the frame for exactly `step` ms
 * and settles from a touch large while it does, so even a 250ms flash has
 * a camera move inside it.
 */
export function strobe(
  tl: Timeline,
  els: HTMLElement[],
  { at, step = 250, from = 1.08 }: { at: number; step?: number; from?: number },
): void {
  els.forEach((el, i) => {
    const on = at + i * step;
    tl.add(el, [{ opacity: 0 }, { opacity: 1 }], {
      delay: on,
      duration: 1,
      easing: ease.expo,
      fill: 'both',
    });
    if (i < els.length - 1) {
      tl.add(el, [{ opacity: 1 }, { opacity: 0 }], {
        delay: on + step,
        duration: 1,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
    const word = el.firstElementChild;
    if (word) {
      tl.add(word, [{ transform: `scale(${from})` }, { transform: 'scale(1)' }], {
        delay: on,
        duration: step * 1.6,
        easing: ease.expo,
        fill: 'both',
      });
    }
  });
}

/**
 * Why: when the next idea joins the frame the headline should make room
 * for it rather than vanish. Scale and lift together on the house curve so
 * the move reads as one camera decision.
 */
export function lift(
  tl: Timeline,
  el: HTMLElement,
  {
    at,
    y,
    scale = 1,
    duration = 820,
  }: { at: number; y: number; scale?: number; duration?: number },
): void {
  tl.add(
    el,
    [
      { transform: 'translateY(0px) scale(1)' },
      { transform: `translateY(${y}px) scale(${scale})` },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

/**
 * Why: a card that pops in from scale alone looks like a modal. Rising
 * a short distance while it lands gives it a floor to come up from.
 */
export function rise(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    step = 80,
    distance = 70,
    duration = 820,
  }: { at: number; step?: number; distance?: number; duration?: number },
): void {
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: `translateY(${distance}px) scale(0.96)`, opacity: 0 },
        { transform: 'translateY(0px) scale(1)', opacity: 1 },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'both' },
    );
  });
}

/**
 * Why: the launch-film move — the lens accelerates into a single letter
 * until its counter (the white inside an "o") fills the frame, and the next
 * screen is found inside it. The origin is measured from the real glyph, not
 * guessed, so the aim survives a font or size change.
 *
 * `target` is an inline element wrapping one letter. `yEm` is where the
 * counter's centre sits below the top of that element's box, in ems (about
 * 0.7 for a lowercase "o" in Inter Tight). Scale climbs on --accel, which
 * reads as a camera gathering speed rather than type growing.
 */
export function zoomThrough(
  tl: Timeline,
  el: HTMLElement,
  target: HTMLElement,
  {
    at,
    duration = 900,
    to = 80,
    yEm = 0.7,
  }: { at: number; duration?: number; to?: number; yEm?: number },
): { x: number; y: number } {
  const origin = originOf(el, target, yEm);
  el.style.transformOrigin = `${origin.x.toFixed(1)}px ${origin.y.toFixed(1)}px`;
  tl.add(el, [{ transform: 'scale(1)' }, { transform: `scale(${to})` }], {
    delay: at,
    duration,
    easing: ease.accel,
    fill: 'forwards',
  });
  return origin;
}

/** transform-origin of `target`'s counter inside `el`, with masks at rest. */
function originOf(el: HTMLElement, target: HTMLElement, yEm: number): { x: number; y: number } {
  // Measure the glyph at rest. Inline style cannot beat a running WAAPI
  // animation, so any animation between `el` and the glyph (a settle, a
  // slam) is parked at its end state for the measurement and put back.
  const parked: [Animation, number | null][] = [];
  const lifted: [HTMLElement, string][] = [];
  for (let n: HTMLElement | null = target; n && n !== el; n = n.parentElement) {
    lifted.push([n, n.style.transform]);
    n.style.transform = 'none';
    for (const a of n.getAnimations()) {
      parked.push([a, typeof a.currentTime === 'number' ? a.currentTime : null]);
      const end = a.effect?.getComputedTiming().endTime;
      a.currentTime = typeof end === 'number' ? end : 0;
    }
  }
  const box = el.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  for (const [n, prev] of lifted) n.style.transform = prev;
  for (const [a, time] of parked) a.currentTime = time;
  // Negative tracking shortens the letter's box on its right side only; the
  // ink stays centred on the advance, so shift back by half the tracking.
  const track = parseFloat(getComputedStyle(target).letterSpacing) || 0;
  const ratio = el.offsetWidth ? box.width / el.offsetWidth : 1;
  const em = parseFloat(getComputedStyle(target).fontSize) * ratio;
  const x = (t.left + t.width / 2 - box.left) / ratio - track / 2;
  const y = (t.top + yEm * em - box.top) / ratio;
  return { x, y };
}

/**
 * Why: whatever the lens found inside the letter must keep travelling
 * toward us, or the zoom reads as a cut. It grows from small on the house
 * curve, continuing the zoom's direction and settling exactly on the beat.
 */
export function emerge(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 1100, from = 0.28 }: { at: number; duration?: number; from?: number },
): void {
  tl.add(el, [{ transform: `scale(${from})` }, { transform: 'scale(1)' }], {
    delay: at,
    duration,
    easing: ease.expo,
    fill: 'both',
  });
}

/**
 * Why: the launch-film type move. The line is simply there — it arrives a
 * touch large and settles into place on the house curve, the way a lens
 * finds focus. No mask, no tilt, no slide: opacity is reached in the first
 * tenth of the move, the scale carries it.
 */
export function settle(
  tl: Timeline,
  els: Element[],
  {
    at,
    step = 70,
    from = 1.22,
    duration = 1100,
  }: { at: number; step?: number; from?: number; duration?: number },
): void {
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: `scale(${from})`, opacity: 0 },
        { opacity: 1, offset: 0.08 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'both' },
    );
  });
}

/**
 * Why: a screen that lands and stops is a slide. After the type settles,
 * the whole shot keeps travelling toward the viewer, linearly, until the
 * cut takes it — the lens, not the type, is moving.
 */
export function creep(
  tl: Timeline,
  el: Element,
  { at, duration, to = 1.05 }: { at: number; duration: number; to?: number },
): void {
  tl.add(el, [{ transform: 'scale(1)' }, { transform: `scale(${to})` }], {
    delay: at,
    duration,
    easing: ease.linear,
    fill: 'both',
  });
}

/**
 * Why: a zoom into a letter needs something to fly into, or the counter is
 * just a white wall. Rings born at the centre and accelerating outward read
 * as a tunnel coming toward the lens. Put `host` inside the zoomed element,
 * behind the type, at the counter's centre: it is clipped to `radius`, so
 * the rings live only inside the letter and scale up with the zoom.
 *
 * Colours are tokens, cycled. Only transform and opacity animate.
 */
export function rings(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    until,
    every = 110,
    life = 900,
    radius = 60,
    colors,
    easing = ease.accel,
  }: {
    at: number;
    until: number;
    every?: number;
    life?: number;
    radius?: number;
    colors: string[];
    /** accel (default) flies rings toward the lens; expo bursts them out. */
    easing?: string;
  },
): void {
  host.style.width = `${radius * 2}px`;
  host.style.height = `${radius * 2}px`;
  host.style.marginLeft = `${-radius}px`;
  host.style.marginTop = `${-radius}px`;
  for (let t = at, i = 0; t < until; t += every, i += 1) {
    const ring = document.createElement('i');
    ring.className = 'ring';
    ring.style.borderColor = `var(${colors[i % colors.length]})`;
    host.append(ring);
    tl.add(
      ring,
      [
        { transform: 'scale(0.04)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { opacity: 1, offset: 0.75 },
        { transform: 'scale(1.15)', opacity: 0 },
      ],
      { delay: t, duration: life, easing, fill: 'both' },
    );
  }
}

/**
 * Why: a flat illustration that only slides is a sticker. Turning it a few
 * degrees in perspective over its hold gives it a plane in space, and the
 * eye reads depth; the translate rides along so it also drifts.
 */
export function orbit(
  tl: Timeline,
  el: Element,
  {
    at,
    duration,
    yaw = [-9, 7],
    pitch = [5, -3],
    dx = [0, 0],
    dy = [18, -18],
  }: {
    at: number;
    duration: number;
    yaw?: [number, number];
    pitch?: [number, number];
    dx?: [number, number];
    dy?: [number, number];
  },
): void {
  const pose = (i: 0 | 1) =>
    `perspective(1800px) translate(${dx[i]}px, ${dy[i]}px) rotateY(${yaw[i]}deg) rotateX(${pitch[i]}deg)`;
  tl.add(el, [{ transform: pose(0) }, { transform: pose(1) }], {
    delay: at,
    duration,
    easing: ease.travel,
    fill: 'both',
  });
}

/**
 * Where `el`'s centre must move (in its own px) to sit on `target`'s centre.
 * Call before animating either: rects are read as they are right now.
 */
export function offsetTo(el: HTMLElement, target: HTMLElement): { x: number; y: number } {
  const a = el.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ratio = target.offsetWidth ? b.width / target.offsetWidth : 1;
  return {
    x: (b.left + b.width / 2 - (a.left + a.width / 2)) / ratio,
    y: (b.top + b.height / 2 - (a.top + a.height / 2)) / ratio,
  };
}

/**
 * Why: an object that pops in place has no origin. Arriving from in front
 * of the lens — large, turned, transparent — and landing flat gives every
 * platform mark a trajectory, which is what makes a beat feel thrown.
 */
export function flyIn(
  tl: Timeline,
  el: Element,
  {
    at,
    duration = 900,
    x = 0,
    y = 0,
    scale = 2.2,
    rotate = 0,
  }: { at: number; duration?: number; x?: number; y?: number; scale?: number; rotate?: number },
): void {
  tl.add(
    el,
    [
      {
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
        opacity: 0,
      },
      { opacity: 1, offset: 0.18 },
      { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', opacity: 1 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'both' },
  );
}

/**
 * Why: when several things become one, they should physically meet. Each
 * element is pulled to the centre of `toward`, shrinking and turning as it
 * goes, on an accelerating curve so they collide rather than drift
 * together. Measure-first: call before any later animation on the same
 * elements is added.
 */
export function converge(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    toward,
    duration = 700,
    scale = 0.3,
    spin = 25,
  }: { at: number; toward: HTMLElement; duration?: number; scale?: number; spin?: number },
): void {
  els.forEach((el, i) => {
    const d = offsetTo(el, toward);
    const turn = (i - (els.length - 1) / 2) * spin;
    tl.add(
      el,
      [
        { transform: 'translate(0px, 0px) rotate(0deg) scale(1)' },
        { transform: `translate(${d.x}px, ${d.y}px) rotate(${turn}deg) scale(${scale})` },
      ],
      { delay: at, duration, easing: ease.accel, fill: 'forwards' },
    );
  });
}

/** Text that must leave before a move: shrink a touch and fade, staggered. */
export function vanish(
  tl: Timeline,
  els: Element[],
  { at, step = 40, duration = 360 }: { at: number; step?: number; duration?: number },
): void {
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.92)', opacity: 0 },
      ],
      { delay: at + i * step, duration, easing: ease.expo, fill: 'forwards' },
    );
  });
}

/**
 * Why: an element born somewhere other than its resting place (a logo
 * born where three marks merged) glides home on the house curve, so the
 * birth and the layout read as one continuous move.
 */
export function slideFrom(
  tl: Timeline,
  el: Element,
  { at, x, y, duration = 1000 }: { at: number; x: number; y: number; duration?: number },
): void {
  tl.add(
    el,
    [{ transform: `translate(${x}px, ${y}px)` }, { transform: 'translate(0px, 0px)' }],
    {
      delay: at,
      duration,
      easing: ease.expo,
      fill: 'both',
    },
  );
}
