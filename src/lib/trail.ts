import { Timeline, ease } from './timeline';

/**
 * Why: a moving pulse without a trail reads as a clean CSS circle. Eight
 * ghosts 22ms apart is fake motion blur — the largest quality gap versus
 * After Effects. Never "clean it up" by reducing the count.
 */
export function ghostTrail(
  tl: Timeline,
  {
    host,
    d,
    at,
    duration,
    count = 8,
    gap = 22,
    from = '0%',
    to = '100%',
    size = 14,
  }: {
    host: HTMLElement;
    d: string;
    at: number;
    duration: number;
    count?: number;
    gap?: number;
    from?: string;
    to?: string;
    size?: number;
  },
): void {
  host.replaceChildren();
  for (let i = 0; i < count; i += 1) {
    const ghost = document.createElement('i');
    ghost.className = 'pulse';
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.offsetPath = `path('${d}')`;
    const inner = document.createElement('b');
    ghost.append(inner);
    host.append(ghost);

    const opacity = 1 - i / count;
    tl.add(
      ghost,
      [
        { offsetDistance: from, opacity: 0 },
        { offsetDistance: from, opacity, offset: 0.04 },
        { offsetDistance: to, opacity: 0 },
      ],
      {
        delay: at + i * gap,
        duration,
        easing: ease.travel,
        fill: 'both',
      },
    );
    tl.add(inner, [{ opacity: 0 }, { opacity: 1 }], {
      delay: at + i * gap,
      duration,
      easing: ease.linear,
      fill: 'both',
    });
  }
}

/**
 * Why: the pulse should appear to paint the wire in behind itself. Dash
 * offset is the one library exception to compositor-only animation — a
 * curve cannot be revealed with scale.
 */
export function drawPath(
  tl: Timeline,
  path: SVGPathElement,
  { at, duration }: { at: number; duration: number },
): void {
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = `${len}`;
  tl.add(path, [{ strokeDashoffset: String(len) }, { strokeDashoffset: '0' }], {
    delay: at,
    duration,
    easing: ease.travel,
    fill: 'both',
  });
}
