/**
 * Why: a WebGL camera is not a WAAPI animation, so it cannot take the house
 * curve as a CSS string. This solves the same cubic-bezier the tokens
 * declare, read from tokens.css, so a 3D move and a DOM move that share a
 * name share a shape. There is still exactly one place a curve is written.
 */
export type Curve = (x: number) => number;

const cache = new Map<string, Curve>();

function bezier(x1: number, y1: number, x2: number, y2: number): Curve {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i += 1) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

/** The curve a motion token names, e.g. curve('--expo'). */
export function curve(name: '--expo' | '--quint' | '--travel'): Curve {
  const hit = cache.get(name);
  if (hit) return hit;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const nums = raw.match(/-?\d*\.?\d+/g)?.map(Number) ?? [];
  const [x1 = 0.5, y1 = 0, x2 = 0.5, y2 = 1] = nums;
  const fn = bezier(x1, y1, x2, y2);
  cache.set(name, fn);
  return fn;
}

/** Progress of `t` through [a, b], clamped to 0..1. */
export function span(t: number, a: number, b: number): number {
  if (b <= a) return t >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}

export function mix(a: number, b: number, p: number): number {
  return a + (b - a) * p;
}

/**
 * Why: Math.random would make two exports different files. A named seed
 * gives the same field, the same turbulence, and the same sandbox every
 * render.
 */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
