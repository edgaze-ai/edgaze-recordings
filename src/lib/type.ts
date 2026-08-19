import { Timeline } from './timeline';

/**
 * Why: a finished prompt is a caption. Characters arriving one at a time
 * is the operator watching someone think.
 */
export function typeOut(
  tl: Timeline,
  el: HTMLElement,
  { at, text, step = 55 }: { at: number; text: string; step?: number },
): void {
  el.textContent = '';
  const chars = [...text];
  chars.forEach((_, i) => {
    tl.at(at + i * step, () => {
      el.textContent = chars.slice(0, i + 1).join('');
    });
  });
}
