import { Timeline, ease } from './timeline';

/**
 * Why: clip-not-fade is the house reveal. Words stagger so nothing arrives
 * together; a gradient phrase stays one mask so the cyan-to-pink ramp does
 * not restart inside every word.
 */
export function prepare(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    if (el.dataset.prepared === '1') return;
    const mode = el.getAttribute('data-split');
    const html = el.innerHTML.trim();
    if (mode === 'whole') {
      const grad = el.classList.contains('grad');
      const body = grad ? `<span class="grad">${html}</span>` : html;
      el.innerHTML = `<span class="m"><i>${body}</i></span>`;
      el.classList.remove('grad');
    } else {
      const words = html.split(/\s+/).filter(Boolean);
      el.innerHTML = words.map((word) => `<span class="m"><i>${word}</i></span>`).join(' ');
    }
    el.dataset.prepared = '1';
  });
}

export function units(scope: ParentNode): HTMLElement[] {
  return [...scope.querySelectorAll<HTMLElement>('.m > i')];
}

export function reveal(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    step = 60,
    duration = 900,
    easing = ease.expo,
  }: {
    at: number;
    step?: number;
    duration?: number;
    easing?: string;
  },
): void {
  els.forEach((el, i) => {
    tl.add(el, [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }], {
      duration,
      delay: at + i * step,
      easing,
      fill: 'forwards',
    });
  });
}

/**
 * Why: a title that stays on while the graph arrives is two ideas in one
 * frame. Clip it out the same way it came in so the next screen is empty.
 */
export function conceal(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    step = 60,
    duration = 700,
    easing = ease.expo,
  }: {
    at: number;
    step?: number;
    duration?: number;
    easing?: string;
  },
): void {
  els.forEach((el, i) => {
    tl.add(el, [{ transform: 'translateY(0)' }, { transform: 'translateY(-115%)' }], {
      duration,
      delay: at + i * step,
      easing,
      fill: 'forwards',
    });
  });
}

export function wipeX(
  tl: Timeline,
  el: Element,
  { at, duration = 800 }: { at: number; duration?: number },
): void {
  tl.add(el, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
    duration,
    delay: at,
    easing: ease.expo,
    fill: 'both',
  });
}

export function popIn(
  tl: Timeline,
  els: HTMLElement[],
  {
    at,
    step = 130,
    duration = 700,
    base = 0.92,
  }: {
    at: number;
    step?: number;
    duration?: number;
    base?: number;
  },
): void {
  els.forEach((el, i) => {
    tl.add(
      el,
      [
        { transform: `scale(${base})`, opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      {
        duration,
        delay: at + i * step,
        easing: ease.expo,
        fill: 'both',
      },
    );
  });
}

/**
 * Why: a clip-up title reads as a slide. The line starts a touch large
 * and eases down to size — in only; the cut takes it off.
 */
export function land(
  tl: Timeline,
  el: HTMLElement,
  { at, duration = 780, from = 1.12 }: { at: number; duration?: number; from?: number },
): void {
  tl.add(
    el,
    [
      { transform: `scale(${from})`, opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}
