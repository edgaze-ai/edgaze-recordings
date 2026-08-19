/**
 * Why: one clock keeps stagger, camera, and pulse locked to storyboard time
 * when the operator drops to 0.25×. WAAPI durations are wall-clock; we scale
 * them so the millisecond numbers in a scene stay readable.
 */
function token(name: '--expo' | '--quint' | '--travel'): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export const ease: { expo: string; quint: string; travel: string; linear: string } = {
  get expo() {
    return token('--expo');
  },
  get quint() {
    return token('--quint');
  },
  get travel() {
    return token('--travel');
  },
  linear: 'linear',
};

type Cue = { at: number; fn: () => void; fired: boolean };
type RafHook = { start: number; fn: (t: number) => boolean; done: boolean };

export class Timeline {
  rate: number;
  readonly seekable: boolean;
  private now = 0;
  private readonly animations: Animation[] = [];
  private readonly timeouts: number[] = [];
  private readonly rafs: number[] = [];
  private readonly cues: Cue[] = [];
  private readonly rafHooks: RafHook[] = [];

  constructor(rate = 1, seekable = false) {
    this.rate = rate;
    this.seekable = seekable;
  }

  get time(): number {
    return this.now;
  }

  add(el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions = {}): Animation {
    const duration =
      typeof opts.duration === 'number' ? opts.duration / this.rate : opts.duration;
    const delay = typeof opts.delay === 'number' ? opts.delay / this.rate : opts.delay;
    const animation = el.animate(frames, {
      ...opts,
      duration,
      delay,
      fill: opts.fill ?? 'both',
    });
    if (this.seekable) {
      animation.pause();
      animation.currentTime = 0;
    }
    this.animations.push(animation);
    return animation;
  }

  at(ms: number, fn: () => void): void {
    if (this.seekable) {
      this.cues.push({ at: ms, fn, fired: false });
      return;
    }
    this.timeouts.push(window.setTimeout(fn, ms / this.rate));
  }

  raf(fn: (t: number) => boolean): void {
    if (this.seekable) {
      this.rafHooks.push({ start: this.now, fn, done: false });
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) * this.rate;
      if (fn(t) === false) return;
      this.rafs.push(requestAnimationFrame(tick));
    };
    this.rafs.push(requestAnimationFrame(tick));
  }

  /**
   * Why: export steps one 60fps frame at a time. Wall-clock play would
   * recapture at ~25fps and smear the trail. Seek keeps every millisecond.
   */
  seek(ms: number): void {
    if (!this.seekable) return;
    this.now = ms;
    const time = ms / this.rate;
    for (const animation of this.animations) {
      animation.pause();
      animation.currentTime = time;
    }
    for (const cue of this.cues) {
      if (cue.fired || cue.at > ms) continue;
      cue.fired = true;
      cue.fn();
    }
    this.tickRafs();
  }

  clear(): void {
    for (const animation of this.animations) animation.cancel();
    for (const id of this.timeouts) window.clearTimeout(id);
    for (const id of this.rafs) cancelAnimationFrame(id);
    this.animations.length = 0;
    this.timeouts.length = 0;
    this.rafs.length = 0;
    this.cues.length = 0;
    this.rafHooks.length = 0;
    this.now = 0;
  }

  private tickRafs(): void {
    for (const hook of this.rafHooks) {
      if (hook.done) continue;
      if (hook.fn((this.now - hook.start) / this.rate) === false) hook.done = true;
    }
  }
}
