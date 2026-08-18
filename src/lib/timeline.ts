/**
 * Why: one clock keeps stagger, camera, and pulse locked to storyboard time
 * when the operator drops to 0.25×. WAAPI durations are wall-clock; we scale
 * them so the millisecond numbers in a scene stay readable.
 */
export const ease = {
  expo: 'var(--expo)',
  quint: 'var(--quint)',
  travel: 'var(--travel)',
  linear: 'linear',
} as const;

export class Timeline {
  rate: number;
  private readonly animations: Animation[] = [];
  private readonly timeouts: number[] = [];
  private readonly rafs: number[] = [];

  constructor(rate = 1) {
    this.rate = rate;
  }

  add(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions = {}): Animation {
    const duration =
      typeof opts.duration === 'number' ? opts.duration / this.rate : opts.duration;
    const delay = typeof opts.delay === 'number' ? opts.delay / this.rate : opts.delay;
    const animation = el.animate(frames, {
      ...opts,
      duration,
      delay,
      fill: opts.fill ?? 'forwards',
    });
    this.animations.push(animation);
    return animation;
  }

  at(ms: number, fn: () => void): void {
    this.timeouts.push(window.setTimeout(fn, ms / this.rate));
  }

  raf(fn: (t: number) => boolean): void {
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) * this.rate;
      if (fn(t) === false) return;
      this.rafs.push(requestAnimationFrame(tick));
    };
    this.rafs.push(requestAnimationFrame(tick));
  }

  clear(): void {
    for (const animation of this.animations) animation.cancel();
    for (const id of this.timeouts) window.clearTimeout(id);
    for (const id of this.rafs) cancelAnimationFrame(id);
    this.animations.length = 0;
    this.timeouts.length = 0;
    this.rafs.length = 0;
  }
}
