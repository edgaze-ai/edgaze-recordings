import { Timeline, ease } from './timeline';

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

/**
 * Why: typing a headline by changing its text reflows the line every
 * keystroke, so a centred title slides sideways as it grows. Splitting the
 * finished line into one span per character keeps layout fixed; typing is
 * then only opacity and scale. A gradient word keeps ONE ramp across its
 * letters: each letter gets the parent's gradient sized to the whole word
 * and offset to its own position, so the colour never restarts.
 */
export function splitChars(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  const solid = nodes.map((n) => /\S/.test(n.nodeValue ?? ''));
  const first = solid.indexOf(true);
  const last = solid.lastIndexOf(true);
  nodes.forEach((node, i) => {
    // Whitespace before the first word or after the last is indentation.
    if (!solid[i] && (i < first || i > last)) node.remove();
  });
  for (const node of nodes.filter((n) => n.isConnected)) {
    // Markup indentation is not text: collapse every whitespace run to one
    // space, as the browser would have, before it becomes a visible span.
    const text = (node.nodeValue ?? '').replace(/\s+/g, ' ');
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      const span = document.createElement('span');
      span.className = ch.trim() ? 'ch' : 'ch sp';
      span.textContent = ch;
      frag.append(span);
      out.push(span);
    }
    node.replaceWith(frag);
  }
  el.querySelectorAll<HTMLElement>('.grad').forEach((word) => {
    const image = getComputedStyle(word).backgroundImage;
    // Drop .grad (and its descender padding) before measuring anything:
    // measuring with it on shifted every letter's slice of the ramp by the
    // padding, so the last letter ran off the end and the ramp restarted.
    // Layout offsets, not rects, so a scaled ancestor can't skew them.
    word.classList.remove('grad');
    const width = word.offsetWidth;
    const left = (ch: HTMLElement) =>
      ch.offsetParent === word.offsetParent ? ch.offsetLeft - word.offsetLeft : ch.offsetLeft;
    word.querySelectorAll<HTMLElement>('.ch').forEach((ch) => {
      const x = left(ch);
      // Each letter's box reaches `pad` past its glyph on both sides (room
      // for overhanging ink, see .ch). Stretch the ramp over the word plus
      // that margin so the last letter's overhang never wraps back to the
      // ramp's first colour.
      const pad = parseFloat(getComputedStyle(ch).paddingLeft) || 0;
      ch.classList.add('grad-ch');
      ch.style.backgroundImage = image;
      ch.style.backgroundRepeat = 'no-repeat';
      ch.style.backgroundSize = `${width + pad * 2}px 100%`;
      ch.style.backgroundPosition = `${-x - pad}px 0`;
    });
  });
  return out.filter((c) => !c.classList.contains('sp'));
}

/**
 * Each character lands from slightly large, `step` ms apart, and the caret
 * jumps to sit after it. Returns the time the last character lands.
 */
export function typeOn(
  tl: Timeline,
  chars: HTMLElement[],
  {
    at,
    step = 60,
    caret,
    caretOff,
  }: { at: number; step?: number; caret?: HTMLElement; caretOff?: number },
): number {
  const host = caret?.offsetParent as HTMLElement | null;
  // Layout offsets, not screen rects: rects are read through whatever scale
  // the title (or the preview) has at build time, which pulled the caret
  // short of the second line. Offsets are transform-free.
  const offset = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== host) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return { x, y };
  };
  const firstTop = chars[0] ? offset(chars[0]).y : 0;
  chars.forEach((ch, i) => {
    const t = at + i * step;
    tl.add(
      ch,
      [
        { transform: 'scale(1.35)', opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: t, duration: 320, easing: ease.expo, fill: 'both' },
    );
    if (caret && host && ch.getClientRects().length) {
      // x follows the letter; y drops a line when a stacked title wraps,
      // measured from the first letter's line, where the caret starts.
      const o = offset(ch);
      const x = o.x + ch.offsetWidth;
      const y = o.y - firstTop;
      const at = `translate(${x}px, ${y}px)`;
      tl.add(caret, [{ transform: at }, { transform: at }], {
        delay: t,
        duration: 1,
        easing: ease.linear,
        fill: 'forwards',
      });
    }
  });
  if (caret) {
    // The caret is there, blinking once, before the first key lands.
    tl.add(caret, [{ opacity: 0 }, { opacity: 1 }], {
      delay: Math.max(0, at - 260),
      duration: 1,
      easing: ease.linear,
      fill: 'both',
    });
    if (caretOff !== undefined) {
      tl.add(caret, [{ opacity: 1 }, { opacity: 0 }], {
        delay: caretOff,
        duration: 180,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
  }
  return at + (chars.length - 1) * step;
}

/**
 * Why: watching a word type from across the room is a caption. The lens sits
 * close on the caret and tracks it along the line while the letters land,
 * then pulls all the way back to reveal the full lockup. `el` is the wrapper
 * that holds the line; it is scaled about its own corner and translated so
 * the tracked letter stays at the wrapper's centre.
 */
export function typeCamera(
  tl: Timeline,
  el: HTMLElement,
  first: HTMLElement,
  last: HTMLElement,
  {
    at,
    until,
    release,
    scale = 2.4,
    back = 1300,
    via = [],
  }: {
    at: number;
    until: number;
    release: number;
    scale?: number;
    back?: number;
    /**
     * Letters the lens passes over on the way, each at the time it lands.
     * A stacked title passes the end of line 1 and the start of line 2, so
     * the lens tracks each line instead of cutting diagonally across both.
     */
    via?: { el: HTMLElement; at: number }[];
  },
): void {
  // Untransformed layout position: the sum of offsets up the chain. Screen
  // rects read through whatever scale the title or stage has while the
  // scene is built, which aimed the lens several letters behind the caret.
  const page = (node: HTMLElement | null) => {
    let x = 0;
    let y = 0;
    while (node) {
      x += node.offsetLeft;
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return { x, y };
  };
  const origin = page(el);
  const centre = (c: HTMLElement) => {
    const p = page(c);
    return {
      x: p.x - origin.x + c.offsetWidth / 2,
      y: p.y - origin.y + c.offsetHeight / 2,
    };
  };
  const pose = (p: { x: number; y: number }) =>
    `translate(${el.offsetWidth / 2 - scale * p.x}px, ${el.offsetHeight / 2 - scale * p.y}px) scale(${scale})`;
  // Measure both ends before adding any animation: once the first move is
  // on, every rect is read inside a 2–3× zoom and the aim is far off.
  const span = Math.max(1, until - at);
  const stops = [
    { t: at, transform: pose(centre(first)) },
    ...via.map((v) => ({ t: v.at, transform: pose(centre(v.el)) })),
    { t: until, transform: pose(centre(last)) },
  ];
  const end = stops[stops.length - 1]!.transform;
  el.style.transformOrigin = '0 0';
  tl.add(
    el,
    stops.map((stop, i) => ({
      transform: stop.transform,
      offset: Math.min(1, Math.max(0, (stop.t - at) / span)),
      // Glide along a line, swing quickly to the next one.
      easing: i % 2 ? ease.travel : ease.linear,
    })),
    {
      delay: at,
      duration: span,
      easing: stops.length > 2 ? ease.linear : ease.travel,
      fill: 'both',
    },
  );
  tl.add(el, [{ transform: end }, { transform: 'translate(0px, 0px) scale(1)' }], {
    delay: release,
    duration: back,
    easing: ease.expo,
    fill: 'forwards',
  });
}
