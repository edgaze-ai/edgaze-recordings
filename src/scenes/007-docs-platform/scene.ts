import '../../styles/scene-007.css';
import {
  breathe,
  cameraPush,
  ease,
  emit,
  frame,
  framePose,
  hardCut,
  motes,
  mountStage,
  Timeline,
  travel3d,
} from '../../lib/index';
import type { Frame } from '../../lib/index';

const DURATION = 35000;

/** Storyboard beats. Every cut in the brief, in one place. */
const CUT = {
  landing: 2_000,
  card2: 6_500,
  sweep: 8_000,
  card3: 13_500,
  delay: 15_000,
  card4: 19_000,
  markdown: 20_500,
  card5: 26_000,
  api: 27_500,
  closing: 32_000,
} as const;

/**
 * Framing marks in plate pixels. The spec marks are centred in the card, not
 * the frame — see CARD below.
 * A plate pixel is 1.5 site pixels: the pages
 * were captured at a 1280 viewport, laid out here at 1920. Every number is a
 * measured position on the real page — see scene-007.css for the survey.
 */
const SHOT = {
  heroTight: { x: 844, y: 348.4, s: 1.55 },
  heroPull: { x: 1_045, y: 590, s: 1.42 },
  paths: { x: 1_090, y: 830, s: 1.25 },
  sweepTop: { x: 1_170, y: 415.4, s: 1.3 },
  sweepEnd: { x: 1_170, y: 1_115, s: 1.3 },
  sweepLast: { x: 1_170, y: 1_170, s: 1.3 },
  delayHead: { x: 901, y: 380.3, s: 1.42 },
  delaySettle: { x: 901, y: 398, s: 1.45 },
  delayMid: { x: 950, y: 760, s: 1.6 },
  delayGraph: { x: 944, y: 1_130, s: 1.95 },
  menuHead: { x: 830, y: 470, s: 1.95 },
  menuOpen: { x: 828, y: 478, s: 1.99 },
  menuHold: { x: 816, y: 506, s: 2.14 },
  rawFront: { x: 460, y: 155, s: 1.95 },
  rawBody: { x: 455, y: 330, s: 2.02 },
  specWide: { x: 960, y: 615, s: 0.7396 },
} satisfies Record<string, Frame>;

/** The spec card, in stage pixels. Matches .glass in scene-007.css. */
const CARD = { w: 1_420, h: 910, fill: 1.85, drop: 270 } as const;

function screen(stage: HTMLElement, name: string): HTMLElement {
  const found = stage.querySelector<HTMLElement>(`[data-screen="${name}"]`);
  if (!found) throw new Error(`Missing screen ${name}`);
  return found;
}

function item(root: ParentNode, selector: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`Missing element ${selector}`);
  return found;
}

/**
 * Why: the line is a zoom, not a fade up. Expo dumps almost all of the scale
 * in the first third, so it arrives fast and lands soft, then keeps creeping
 * for the rest of the hold — a card that stops moving reads as a slide.
 */
function cardIn(tl: Timeline, card: HTMLElement, at: number, hold: number, punch = 440): void {
  const line = item(card, 'h1');
  tl.add(
    line,
    [
      { transform: 'scale(0.74)', opacity: 0 },
      { transform: 'scale(1.028)', opacity: 1, offset: 0.62 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration: punch, easing: ease.expo, fill: 'forwards' },
  );
  tl.add(line, [{ transform: 'scale(1)' }, { transform: 'scale(1.026)' }], {
    delay: at + punch,
    duration: Math.max(200, hold - punch),
    easing: ease.linear,
    fill: 'forwards',
  });
}

/**
 * Why: the spots are the only light this scene adds to the product. They come
 * up under the thing the camera is already on and fall away before the cut,
 * so nothing hard-edged ever sits on a real control.
 */
function lift(tl: Timeline, el: HTMLElement, at: number, duration: number, peak = 0.9): void {
  tl.add(
    el,
    [
      { transform: 'scale(0.86)', opacity: 0 },
      { transform: 'scale(1)', opacity: peak, offset: 0.34 },
      { transform: 'scale(1.1)', opacity: peak * 0.62, offset: 0.72 },
      { transform: 'scale(1.16)', opacity: 0 },
    ],
    { delay: at, duration, easing: ease.travel, fill: 'forwards' },
  );
}

function hold(
  tl: Timeline,
  el: HTMLElement,
  at: number,
  mark: Frame,
  width = 1_920,
  height = 1_080,
): void {
  tl.add(el, [framePose(mark, width, height), framePose(mark, width, height)], {
    delay: at,
    duration: 1,
    easing: ease.linear,
    fill: 'both',
  });
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, item(stage, '.camera'), { duration: DURATION });

    const card1 = screen(stage, 'card-1');
    const landing = screen(stage, 'landing');
    const card2 = screen(stage, 'card-2');
    const sweep = screen(stage, 'sweep');
    const card3 = screen(stage, 'card-3');
    const delay = screen(stage, 'delay');
    const card4 = screen(stage, 'card-4');
    const markdown = screen(stage, 'markdown');
    const card5 = screen(stage, 'card-5');
    const api = screen(stage, 'api');
    const closing = screen(stage, 'closing');

    // 0.0 — Edgaze has documentation now.
    cardIn(tl, card1, 0, CUT.landing);

    // 2.0 — the landing page. Hero, then one continuous pull out to the three
    // path cards: a fast expo break off the mark, then a long even settle.
    hardCut(tl, card1, landing, CUT.landing);
    const landingRig = item(landing, '[data-rig="landing"]');
    frame(tl, landingRig, {
      at: CUT.landing,
      duration: 1_150,
      from: SHOT.heroTight,
      to: SHOT.heroPull,
    });
    frame(tl, landingRig, {
      at: CUT.landing + 1_150,
      duration: CUT.card2 - CUT.landing - 1_150,
      from: SHOT.heroPull,
      to: SHOT.paths,
      easing: ease.travel,
    });
    lift(tl, item(landing, '[data-spot="hero"]'), 2_040, 1_700);
    emit(tl, item(landing, '[data-spark="hero"]'), {
      at: 2_160,
      count: 9,
      duration: 620,
      radius: 96,
    });
    lift(tl, item(landing, '[data-spot="paths"]'), 4_050, 2_300, 0.8);
    emit(tl, item(landing, '[data-spark="buyers"]'), {
      at: 4_250,
      count: 6,
      duration: 560,
      radius: 74,
    });
    emit(tl, item(landing, '[data-spark="creators"]'), {
      at: 4_380,
      count: 6,
      duration: 560,
      radius: 74,
    });
    emit(tl, item(landing, '[data-spark="developers"]'), {
      at: 4_510,
      count: 6,
      duration: 560,
      radius: 74,
    });
    motes(tl, item(landing, '[data-dust="landing"]'), {
      at: CUT.landing,
      duration: CUT.card2 - CUT.landing,
      count: 20,
      seed: 71,
    });

    // 6.5 — Every block. Every price. Every policy.
    hardCut(tl, landing, card2, CUT.card2);
    cardIn(tl, card2, CUT.card2, CUT.sweep - CUT.card2);

    // 8.0 — the index sweep. Three real anchors on the same page, cut on the
    // beat and travelled at one constant speed, so it reads as one scroll
    // rather than three shots.
    hardCut(tl, card2, sweep, CUT.sweep);
    const legs = [
      { rig: 'sweep-builder', spot: 'builder', at: CUT.sweep, to: 9_820, end: SHOT.sweepEnd },
      { rig: 'sweep-payments', spot: 'payments', at: 9_820, to: 11_640, end: SHOT.sweepEnd },
      { rig: 'sweep-legal', spot: 'legal', at: 11_640, to: CUT.card3, end: SHOT.sweepLast },
    ] as const;
    let previous: HTMLElement | null = null;
    for (const leg of legs) {
      const rig = item(sweep, `[data-rig="${leg.rig}"]`);
      if (previous) hardCut(tl, previous, rig, leg.at);
      previous = rig;
      frame(tl, rig, {
        at: leg.at,
        duration: leg.to - leg.at,
        from: SHOT.sweepTop,
        to: leg.end,
        easing: ease.linear,
      });
      lift(tl, item(sweep, `[data-spot="${leg.spot}"]`), leg.at + 40, 900, 0.7);
      tl.add(
        item(sweep, '[data-scan]'),
        [
          { transform: 'translate3d(0, -260px, 0)', opacity: 0 },
          { transform: 'translate3d(0, 380px, 0)', opacity: 0.9, offset: 0.42 },
          { transform: 'translate3d(0, 1180px, 0)', opacity: 0 },
        ],
        { delay: leg.at, duration: leg.to - leg.at, easing: ease.linear, fill: 'forwards' },
      );
    }
    motes(tl, item(sweep, '[data-dust="sweep"]'), {
      at: CUT.sweep,
      duration: CUT.card3 - CUT.sweep,
      count: 26,
      seed: 133,
      rise: 300,
    });

    // 13.5 — Written for people.
    hardCut(tl, sweep, card3, CUT.card3);
    cardIn(tl, card3, CUT.card3, CUT.delay - CUT.card3);

    // 15.0 — the craft shot. One move down the real Delay page, from the title
    // into the generated docsgraph, and then it sits on Input to Delay to
    // Output while a lamp rides the wire.
    hardCut(tl, card3, delay, CUT.delay);
    const delayRig = item(delay, '[data-rig="delay"]');
    frame(tl, delayRig, {
      at: CUT.delay,
      duration: 420,
      from: SHOT.delayHead,
      to: SHOT.delaySettle,
      easing: ease.linear,
    });
    frame(tl, delayRig, {
      at: CUT.delay + 420,
      duration: 780,
      from: SHOT.delaySettle,
      to: SHOT.delayMid,
    });
    frame(tl, delayRig, {
      at: CUT.delay + 1_200,
      duration: CUT.card4 - CUT.delay - 1_200,
      from: SHOT.delayMid,
      to: SHOT.delayGraph,
      easing: ease.travel,
    });
    lift(tl, item(delay, '[data-spot="graph"]'), 15_900, 2_600, 0.85);
    tl.add(
      item(delay, '[data-lamp]'),
      [
        { transform: 'translate3d(0, 0, 0) scale(0.4)', opacity: 0 },
        { transform: 'translate3d(120px, 0, 0) scale(1)', opacity: 0.95, offset: 0.18 },
        { transform: 'translate3d(540px, 0, 0) scale(1)', opacity: 0.95, offset: 0.82 },
        { transform: 'translate3d(659px, 0, 0) scale(0.4)', opacity: 0 },
      ],
      { delay: 16_350, duration: 1_250, easing: ease.linear, fill: 'forwards' },
    );
    emit(tl, item(delay, '[data-spark="input"]'), {
      at: 16_300,
      count: 6,
      duration: 560,
      radius: 66,
    });
    emit(tl, item(delay, '[data-spark="delay"]'), {
      at: 16_620,
      count: 8,
      duration: 620,
      radius: 80,
    });
    emit(tl, item(delay, '[data-spark="output"]'), {
      at: 16_940,
      count: 6,
      duration: 560,
      radius: 66,
    });
    motes(tl, item(delay, '[data-dust="delay"]'), {
      at: CUT.delay,
      duration: CUT.card4 - CUT.delay,
      count: 18,
      seed: 907,
      rise: 170,
    });

    // 19.0 — And for agents. The turn, so the line settles 200ms sooner and
    // holds that much longer than the others.
    hardCut(tl, delay, card4, CUT.card4);
    cardIn(tl, card4, CUT.card4, CUT.markdown - CUT.card4, 240);

    // 20.5 — the markdown reveal. Same page, still on the header; the Open in
    // menu lands on one frame because that is what the component does; then
    // the raw .md with its frontmatter.
    hardCut(tl, card4, markdown, CUT.markdown);
    const mdRig = item(markdown, '[data-rig="markdown"]');
    const rawRig = item(markdown, '[data-rig="raw"]');
    frame(tl, mdRig, {
      at: CUT.markdown,
      duration: 650,
      from: SHOT.menuHead,
      to: SHOT.menuOpen,
      easing: ease.linear,
    });
    for (const pop of ['trigger', 'menu']) {
      tl.add(item(markdown, `[data-pop="${pop}"]`), [{ opacity: 0 }, { opacity: 1 }], {
        delay: 21_150,
        duration: 1,
        easing: ease.linear,
        fill: 'forwards',
      });
    }
    frame(tl, mdRig, {
      at: 21_150,
      duration: 1_700,
      from: SHOT.menuOpen,
      to: SHOT.menuHold,
      easing: ease.travel,
    });
    lift(tl, item(markdown, '[data-spot="menu"]'), 21_150, 1_500);
    emit(tl, item(markdown, '[data-spark="menu"]'), {
      at: 21_260,
      count: 9,
      duration: 640,
      radius: 92,
    });

    hardCut(tl, mdRig, rawRig, 22_850);
    hold(tl, rawRig, CUT.markdown, SHOT.rawFront);
    frame(tl, rawRig, {
      at: 22_850,
      duration: CUT.card5 - 22_850,
      from: SHOT.rawFront,
      to: SHOT.rawBody,
      easing: ease.travel,
    });
    lift(tl, item(markdown, '[data-spot="front"]'), 22_900, 1_900, 0.75);
    motes(tl, item(markdown, '[data-dust="markdown"]'), {
      at: CUT.markdown,
      duration: CUT.card5 - CUT.markdown,
      count: 20,
      seed: 4_211,
      rise: 190,
    });

    // 26.0 — The API spec is generated from the code.
    hardCut(tl, markdown, card5, CUT.card5);
    cardIn(tl, card5, CUT.card5, CUT.api - CUT.card5);

    // 27.5 — the spec page, pulled all the way back. It opens filling the
    // frame on the Zod line, then the card shrinks out of the bleed and the
    // page keeps zooming out inside it until the whole document is an object
    // on moving gradient: sidebar, article, On this page rail, all of it.
    hardCut(tl, card5, api, CUT.api);
    const specRig = item(api, '[data-rig="openapi"]');
    const glass = item(api, '[data-glass]');
    travel3d(tl, glass, {
      at: CUT.api,
      duration: 1_800,
      from: { s: CARD.fill, y: CARD.drop },
      to: { s: 1 },
      easing: ease.travel,
    });
    travel3d(tl, glass, {
      at: CUT.api + 1_800,
      duration: CUT.closing - CUT.api - 1_800,
      from: { s: 1 },
      to: { s: 1.014, y: -7 },
      easing: ease.linear,
    });
    // The page never moves inside the card. It is fitted to it edge to edge
    // for the whole beat, so the pull back is the card getting smaller and the
    // document coming whole — never a zoom happening inside the glass.
    hold(tl, specRig, CUT.api, SHOT.specWide, CARD.w, CARD.h);
    const blobs = [
      { name: 'cyan', from: 0.86, mid: 1.16, to: 1.04, peak: 1, rest: 0.86, dx: 230, dy: 150 },
      {
        name: 'violet',
        from: 1.08,
        mid: 0.88,
        to: 1.1,
        peak: 0.94,
        rest: 0.8,
        dx: -280,
        dy: -120,
      },
      { name: 'pink', from: 0.92, mid: 1.18, to: 1, peak: 0.9, rest: 0.78, dx: -210, dy: 165 },
    ];
    blobs.forEach((blob, i) => {
      breathe(tl, item(api, `[data-blob="${blob.name}"]`), {
        at: CUT.api + i * 90,
        duration: CUT.closing - CUT.api - i * 90,
        from: blob.from,
        mid: blob.mid,
        to: blob.to,
        peak: blob.peak,
        rest: blob.rest,
        dx: blob.dx,
        dy: blob.dy,
      });
    });
    tl.add(
      item(api, '[data-sheen]'),
      [
        { transform: 'translate3d(0, 0, 0) rotate(14deg)', opacity: 0 },
        { transform: 'translate3d(1100px, 0, 0) rotate(14deg)', opacity: 0.9, offset: 0.38 },
        { transform: 'translate3d(3100px, 0, 0) rotate(14deg)', opacity: 0 },
      ],
      { delay: 30_300, duration: 1_400, easing: ease.travel, fill: 'forwards' },
    );
    lift(tl, item(api, '[data-spot="zod"]'), CUT.api + 40, 1_500, 0.85);
    emit(tl, item(api, '[data-spark="zod"]'), {
      at: 27_760,
      count: 8,
      duration: 620,
      radius: 86,
    });
    motes(tl, item(api, '[data-dust="api"]'), {
      at: CUT.api,
      duration: CUT.closing - CUT.api,
      count: 20,
      seed: 5_309,
      rise: 220,
    });

    // 32.0 — hard cut to black, a beat, then the address fades up.
    hardCut(tl, api, closing, CUT.closing);
    const closingLine = item(closing, 'h1');
    tl.add(
      closingLine,
      [
        { transform: 'scale(0.965)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: CUT.closing + 220, duration: 500, easing: ease.travel, fill: 'forwards' },
    );
    tl.add(closingLine, [{ transform: 'scale(1)' }, { transform: 'scale(1.024)' }], {
      delay: CUT.closing + 720,
      duration: DURATION - CUT.closing - 720,
      easing: ease.linear,
      fill: 'forwards',
    });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
      el.style.opacity = el.dataset.screen === 'closing' ? '1' : '0';
    });
    const line = item(stage, '[data-screen="closing"] h1');
    line.style.opacity = '1';
    line.style.transform = 'scale(1)';
    item(stage, '.camera').style.transform = 'scale(1.032)';
  },
});
