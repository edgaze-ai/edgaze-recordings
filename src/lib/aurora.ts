import { Timeline, ease } from './timeline';

/**
 * Why: a flowing brand light under the important frames — black above, the
 * cyan-to-pink glow living along the bottom edge. It has to move like light
 * on a surface, not like an effect: each blob drifts on a pair of detuned,
 * slow sines whose phase is film time, so it never visibly loops, never
 * pulses, and two consecutive frames that carry it read as the same light
 * still moving. The path is sampled into keyframes on the storyboard clock,
 * so a scrub or an export lands on the same frame; transform only.
 *
 * On entry the whole field rises from below the frame and fades up, so the
 * glow arrives from the bottom rather than switching on.
 */
export function aurora(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    duration,
    rise = 900,
    step = 160,
    pace = 1,
    amp = 1,
  }: {
    at: number;
    duration: number;
    rise?: number;
    step?: number;
    /** Speed of the drift; below 1 is calmer. */
    pace?: number;
    /** Size of the drift; below 1 keeps the light closer to where it sits. */
    amp?: number;
  },
): void {
  tl.add(
    host,
    [
      { transform: 'translate3d(0, 120px, 0)', opacity: 0 },
      { transform: 'translate3d(0, 0, 0)', opacity: 1 },
    ],
    { delay: at, duration: rise, easing: ease.expo, fill: 'both' },
  );

  const blobs = [...host.querySelectorAll<HTMLElement>(':scope > i[data-blob]')];
  blobs.forEach((el, i) => {
    const a = i * 1.91 + 0.4;
    const base = Number(el.dataset.tilt ?? 0);
    const n = Math.max(2, Math.ceil(duration / step));
    const frames: Keyframe[] = [];
    for (let k = 0; k <= n; k += 1) {
      const s = ((at + (duration * k) / n) / 1000) * pace;
      const x = amp * (220 * Math.sin(s * 0.23 + a) + 110 * Math.sin(s * 0.51 + a * 2.1));
      const y = amp * (70 * Math.sin(s * 0.31 + a * 1.3) + 36 * Math.cos(s * 0.67 + a));
      const scale = 1 + amp * 0.09 * Math.sin(s * 0.27 + a * 0.7);
      const rot = base + amp * 7 * Math.sin(s * 0.19 + a);
      frames.push({
        transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
      });
    }
    tl.add(el, frames, { delay: at, duration, easing: ease.linear, fill: 'both' });
  });
}
