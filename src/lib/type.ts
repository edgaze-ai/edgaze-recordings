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

type Segment = { node: Text; text: string };

function segments(el: HTMLElement): Segment[] {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const found: Segment[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? '';
    if (text) found.push({ node: node as Text, text });
  }
  return found;
}

/**
 * Why: typeOut owns the whole element, so it flattens any markup inside it.
 * A terminal that types its command in one colour is a caption; the tell that
 * it is a real shell is that the string literal is already the string colour
 * as the character lands. This walks the text nodes of an already-highlighted
 * block and fills them in order, so the syntax theme survives the typing.
 *
 * Whitespace between tokens is emitted in one step rather than per character:
 * a leading indent typed space by space reads as a stall, not as typing.
 */
export function typeRich(
  tl: Timeline,
  el: HTMLElement,
  { at, step = 12 }: { at: number; step?: number },
): number {
  const parts = segments(el);
  for (const part of parts) part.node.nodeValue = '';

  let cursor = at;
  for (const part of parts) {
    const chars = [...part.text];
    let i = 0;
    while (i < chars.length) {
      const run = chars[i] === ' ' || chars[i] === '\n' ? countRun(chars, i) : 1;
      const end = i + run;
      const head = chars.slice(0, end).join('');
      tl.at(cursor, () => {
        part.node.nodeValue = head;
      });
      cursor += step;
      i = end;
    }
  }
  return cursor;
}

function countRun(chars: string[], from: number): number {
  let n = 0;
  while (from + n < chars.length && (chars[from + n] === ' ' || chars[from + n] === '\n'))
    n += 1;
  return n;
}
