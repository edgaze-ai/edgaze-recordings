import { Timeline } from './timeline';

/**
 * Why: a linear counter is the tell that the number was bolted on. quartOut
 * makes the last digits linger so it feels counted, not tweened.
 */
export function countUp(
  tl: Timeline,
  el: Element,
  {
    to,
    at,
    duration = 1400,
    decimals = 0,
    prefix = '',
    suffix = '',
  }: {
    to: number;
    at: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  },
): void {
  const quartOut = (t: number) => 1 - (1 - t) ** 4;
  const format = (value: number) => {
    const fixed = value.toFixed(decimals);
    const [whole, frac] = fixed.split('.');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return frac ? `${grouped}.${frac}` : grouped;
  };

  el.textContent = `${prefix}${format(0)}${suffix}`;
  // Registered at build, so `t` is absolute scene time. Starting the clock
  // from a cue instead would restart the count wherever a scrub or an
  // export first lands after `at`, and show 0 on a frame deep into the move.
  tl.raf((t) => {
    if (t < at) return true;
    const p = Math.min((t - at) / duration, 1);
    el.textContent = `${prefix}${format(to * quartOut(p))}${suffix}`;
    return p < 1;
  });
}
