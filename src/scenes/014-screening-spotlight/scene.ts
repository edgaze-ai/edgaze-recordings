import {
  barAt,
  breathe,
  cameraPush,
  colorWipe,
  countUp,
  creep,
  drift,
  ease,
  flurry,
  flyIn,
  frame,
  footage,
  gridMap,
  grow,
  holdScreen,
  irisWipe,
  mountStage,
  orbit,
  popIn,
  rings,
  rise,
  settle,
  splitChars,
  stamp,
  swap,
  vanish,
} from '../../lib/index';

/**
 * 014 — Daily Workflow Spotlight #002: "Title and Abstract Screening for
 * Systematic Reviews" by Arjun Kuttikkat. Vertical (1080×1920), 30s.
 *
 * Problem first (a researcher under thousands of papers), then the method
 * (two independent AI screeners, excluded only when both agree), the real
 * run, and the real deliverable as the centrepiece: the decisions
 * spreadsheet and the PRISMA 2020 counts, then the researcher's reaction.
 *
 * Every number and row below is from one real run on 2026-11-21 (run
 * 3c4b4440): a PubMed export of 1,200 records on psychotherapy for
 * borderline personality disorder plus the listing's 50-record example
 * file, screened against the Oud 2018 review's criteria in 2m 37s. The
 * footage (videos/014-run.mp4, 10s) is that run, recorded in light mode:
 * input 0–5.6s (scrolling down to the Run click), working 5.6–8.0s, results
 * from 8.0s on the bar-10 downbeat.
 *
 * Every time is a bar and beat on MAP, never a raw millisecond.
 */
const DURATION = 34000;
const W = 1080;
const H = 1920;
const BPM = 120;
const MAP = gridMap(BPM, DURATION, {
  source: '014 score · 120bpm',
  energy: [0.5, 0.6, 0.75, 0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.8, 1, 0.5],
});
const B = (bar: number, beat = 0) => barAt(MAP, bar, beat);
const BEAT = B(1, 1) - B(1);

const HOOK_BAR = 1;
const PAIR_BAR = 3;
const TITLE_BAR = 5;
const RUN_BAR = 6;
const SHEET_BAR = 11;
const PRISMA_BAR = 13;
const WOW_BAR = 15;
const CTA_BAR = 16;

/** Footage clock (seconds into 014-run.mp4) → scene ms. */
const F = (sec: number) => B(RUN_BAR) + sec * 1000;
/** Moments in the 10s footage: the export lands, the criteria are pasted, Run is clicked. */
const UPLOAD_AT = 1.5;
const PASTE_AT = 3.4;
const RUN_AT = 5.6;
const RESULT_AT = F(8.0);

type Verdict = 'include' | 'exclude' | 'check';
const GLYPH: Record<Verdict, string> = { include: '✓', exclude: '✕', check: '?' };
const WORD: Record<Verdict, string> = {
  include: 'Include',
  exclude: 'Exclude',
  check: 'Check',
};

/** Three real records and how each screener judged them. */
const PAIR: { title: string; meta: string; s1: Verdict; s2: Verdict; final: Verdict }[] = [
  {
    title:
      'Dialectical behavior therapy for high suicide risk in individuals with borderline personality disorder: a randomized clinical trial',
    meta: 'Linehan · JAMA Psychiatry · 2015',
    s1: 'include',
    s2: 'include',
    final: 'include',
  },
  {
    title:
      'The use of dialectical behavior therapy and prolonged exposure to treat comorbid dissociation and self-harm: the case of a client',
    meta: 'Granato · J Clin Psychol · 2015',
    s1: 'exclude',
    s2: 'exclude',
    final: 'exclude',
  },
  {
    title:
      'Emotions observed during sessions of dialectical behavior therapy predict outcome for borderline personality disorder',
    meta: 'Nardone · J Consult Clin Psychol · 2024',
    s1: 'exclude',
    s2: 'include',
    final: 'check',
  },
];

/** Real rows from screening-decisions.csv (run 3c4b4440). */
const SHEET: { title: string; v: Verdict; reason: string }[] = [
  {
    title:
      'Dialectical behavior therapy for high suicide risk in BPD: a randomized clinical trial',
    v: 'include',
    reason: 'Check comparator eligibility at full text.',
  },
  {
    title: 'DBT and prolonged exposure for dissociation and self-harm: the case of a client',
    v: 'exclude',
    reason: 'C6: “This case study”',
  },
  {
    title:
      'Outcome of mentalization-based and supportive psychotherapy in BPD: a randomized trial',
    v: 'include',
    reason: 'Check comparator eligibility at full text.',
  },
  {
    title: 'Emotions observed during DBT sessions predict outcome for BPD',
    v: 'check',
    reason: 'Screeners disagreed: no randomised trial described.',
  },
  {
    title:
      'Borderline personality disorder and mental healthcare service use among adolescents',
    v: 'exclude',
    reason: 'C1: “adolescents (mean age 16.3)”',
  },
  {
    title: 'A pilot RCT of DBT with and without prolonged exposure for women with BPD and PTSD',
    v: 'include',
    reason: 'Check participant ages and comparator at full text.',
  },
  {
    title: 'Naturalistic outcomes of evidence-based therapies for BPD at a university clinic',
    v: 'exclude',
    reason: 'C6: “naturalistic outcomes”',
  },
  {
    title: 'DBT in Chinese suicidal patients with BPD: a pilot randomized controlled trial',
    v: 'check',
    reason: 'No abstract: judged on the title only.',
  },
];

/** The run's PRISMA 2020 counts, laid out as a flow (px inside .rv-flow). */
const PRISMA = {
  boxes: [
    { label: 'Records identified', n: 1250, x: 0, y: 0, w: 600, h: 170 },
    { label: 'Duplicates removed', n: 24, x: 650, y: 150, w: 310, h: 160 },
    { label: 'Records screened', n: 1226, x: 0, y: 300, w: 600, h: 170 },
    {
      label: 'Excluded, both screeners agreed',
      n: 840,
      x: 650,
      y: 450,
      w: 310,
      h: 190,
      tone: 'exclude',
    },
    { label: 'Kept for full text', n: 386, x: 0, y: 600, w: 600, h: 170 },
    { label: 'Include', n: 109, x: 0, y: 890, w: 290, h: 160, tone: 'include' },
    { label: 'Check first', n: 277, x: 310, y: 890, w: 290, h: 160, tone: 'check' },
  ],
  /** [x, y, length, axis] — connectors drawn between the boxes, in order. */
  links: [
    [297, 170, 130, 'v'],
    [300, 227, 350, 'h'],
    [297, 470, 130, 'v'],
    [300, 545, 350, 'h'],
    [297, 770, 60, 'v'],
    [145, 827, 310, 'h'],
    [142, 830, 60, 'v'],
    [452, 830, 60, 'v'],
  ] as [number, number, number, 'v' | 'h'][],
};
const SCREENED = 1226;
const ROW_STEP = 240;

/** Centre of an element in stage coordinates, measured at rest. */
const centreOf = (el: HTMLElement, stage: HTMLElement) => {
  const a = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const k = s.width / W;
  return { x: (a.left + a.width / 2 - s.left) / k, y: (a.top + a.height / 2 - s.top) / k };
};

const el = (tag: string, cls: string, text?: string) => {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

mountStage({
  width: W,
  height: H,
  duration: DURATION,
  bpm: BPM,
  beats: MAP,
  build(tl, stage) {
    const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = stage) =>
      root.querySelector<T>(sel)!;
    const all = <T extends Element = HTMLElement>(sel: string, root: ParentNode = stage) => [
      ...root.querySelectorAll<T>(sel),
    ];
    const screen = (name: string) => q(`[data-screen="${name}"]`);
    const wipes = q('.wipes');

    // ── Data into markup (before anything is measured) ──────────────
    const records = q('.rv-records');
    PAIR.forEach((r) => {
      const card = el('article', 'rv-card');
      card.append(el('h3', '', r.title), el('p', 'rv-meta', r.meta));
      const marks = el('div', 'rv-marks');
      for (const v of [r.s1, r.s2]) {
        const m = el('b', 'rv-mark', GLYPH[v]);
        m.dataset.v = v;
        marks.append(m);
      }
      const verdict = el('span', 'rv-verdict', WORD[r.final]);
      verdict.dataset.v = r.final;
      marks.append(verdict);
      card.append(marks);
      records.append(card);
    });
    const rowsHost = q('.rv-rows');
    SHEET.forEach((r) => {
      const row = el('div', 'rv-row');
      row.dataset.v = r.v;
      const d = el('span', 'rv-d');
      d.append(el('b', '', GLYPH[r.v]), document.createTextNode(WORD[r.v]));
      row.append(el('span', 'rv-t', r.title), d, el('span', 'rv-r', r.reason));
      rowsHost.append(row);
    });
    const flow = q('.rv-flow');
    PRISMA.links.forEach(([x, y, len, axis]) => {
      const link = el('i', `rv-link ${axis}`);
      Object.assign(link.style, {
        left: `${x}px`,
        top: `${y}px`,
        [axis === 'v' ? 'height' : 'width']: `${len}px`,
      });
      flow.append(link);
    });
    PRISMA.boxes.forEach((b) => {
      const box = el('div', 'rv-box');
      if (b.tone) box.dataset.tone = b.tone;
      Object.assign(box.style, {
        left: `${b.x}px`,
        top: `${b.y}px`,
        width: `${b.w}px`,
        height: `${b.h}px`,
      });
      const num = el('b', '', '0');
      num.dataset.to = String(b.n);
      box.append(el('p', '', b.label), num);
      flow.append(box);
    });

    cameraPush(tl, q('.camera'), { duration: DURATION, to: 1.03 });
    all('.river').forEach((river) => {
      [...river.children].forEach((ribbon, i) => {
        drift(tl, ribbon, { duration: DURATION, dx: i ? -700 : 700, dy: i ? -10 : 10 });
      });
    });

    const reel: [HTMLElement, number][] = [
      [screen('hook'), B(HOOK_BAR)],
      [screen('pair'), B(PAIR_BAR)],
      [screen('title'), B(TITLE_BAR)],
      [screen('run'), B(RUN_BAR)],
      [screen('sheet'), B(SHEET_BAR)],
      [screen('prisma'), B(PRISMA_BAR)],
      [screen('wow'), B(WOW_BAR)],
      [screen('cta'), B(CTA_BAR)],
    ];
    reel.forEach(([node, at], i) => holdScreen(tl, node, { at, until: reel[i + 1]?.[1] }));

    // ── Bars 1–2 · Too much to read. A storm of papers falls past the
    //    lens while a researcher sinks behind towers of print. ──────────
    const hook = screen('hook');
    flurry(tl, q('.rv-storm', hook), {
      at: B(HOOK_BAR) - 1800,
      until: B(PAIR_BAR),
      count: 78,
      width: W,
      height: H,
      fall: 2400,
    });
    // The line arrives whole, as one piece.
    settle(tl, [q('.rv-hook', hook)], { at: B(HOOK_BAR, 0.75), from: 1.2, duration: 1200 });
    rise(tl, all('.rv-tired .pc', hook), {
      at: B(HOOK_BAR),
      step: 90,
      distance: 160,
      duration: 1000,
    });
    orbit(tl, q('.rv-tired', hook), {
      at: B(HOOK_BAR),
      duration: B(PAIR_BAR) - B(HOOK_BAR),
      yaw: [8, -4],
      pitch: [4, -2],
      dy: [20, -10],
    });
    creep(tl, hook, { at: B(HOOK_BAR), duration: B(PAIR_BAR) - B(HOOK_BAR), to: 1.05 });

    // ── Bars 3–4 · Two screeners read every record on their own; a
    //    record is excluded only when both say so. Each verdict stamps. ─
    const pair = screen('pair');
    colorWipe(tl, wipes, {
      cover: B(PAIR_BAR),
      from: 'top',
      colors: ['--cat-research-2', '--cat-research', '--ground'],
      step: 70,
    });
    const [pairA, pairB] = all('.row', pair);
    settle(tl, all('.w', pairA!), { at: B(PAIR_BAR), from: 1.2 });
    settle(tl, all('.w', pairB!), { at: B(PAIR_BAR, 0.5), from: 1.2 });
    const eyes = all('.rv-eye', pair);
    popIn(tl, eyes, { at: B(PAIR_BAR, 0.25), step: 120, base: 0.4, duration: 800 });
    eyes.forEach((eye) => {
      breathe(tl, q('.rv-ring:nth-child(2)', eye), {
        at: B(PAIR_BAR, 0.5),
        duration: B(TITLE_BAR) - B(PAIR_BAR, 0.5),
        from: 0.9,
        mid: 1.12,
        to: 1,
        fadeFrom: 1,
        peak: 1,
        rest: 1,
      });
    });
    const cards = all('.rv-card', pair);
    rise(tl, cards, { at: B(PAIR_BAR, 0.75), step: 140, distance: 90, duration: 900 });
    cards.forEach((card, i) => {
      const at = B(PAIR_BAR, 1.5) + i * BEAT * 0.9;
      stamp(tl, all('.rv-mark', card), { at, step: 150, tilt: i % 2 ? 6 : -6 });
      settle(tl, [q('.rv-verdict', card)], { at: at + 380, from: 1.4, duration: 700 });
    });
    settle(tl, [q('.rv-rule', pair)], { at: B(PAIR_BAR + 1, 2.5), from: 1.1, duration: 900 });
    creep(tl, pair, { at: B(PAIR_BAR), duration: B(TITLE_BAR) - B(PAIR_BAR), to: 1.03 });

    // ── Bar 5 · The name, assembled letter by letter. ─────────────────
    const title = screen('title');
    const titleBlock = q('.rv-titleblock', title);
    irisWipe(tl, wipes, {
      cover: B(TITLE_BAR),
      x: W / 2,
      y: centreOf(titleBlock, stage).y,
      width: W,
      height: H,
      colors: ['--cat-support', '--mesh-b', '--ground'],
    });
    settle(tl, [q('.rv-kicker', title)], { at: B(TITLE_BAR), from: 1.12, duration: 900 });
    // The name assembles letter by letter, rising out of the white.
    rise(tl, splitChars(q('.rv-title', title)), {
      at: B(TITLE_BAR) + 60,
      step: 26,
      distance: 70,
      duration: 820,
    });
    settle(tl, [q('.rv-for', title)], { at: B(TITLE_BAR, 1.25), from: 1.15, duration: 900 });
    settle(tl, [q('.rv-by', title)], { at: B(TITLE_BAR, 2), from: 1.12, duration: 900 });
    creep(tl, title, { at: B(TITLE_BAR), duration: B(RUN_BAR) - B(TITLE_BAR), to: 1.04 });

    // ── Bars 6–10 · The real run in one steady frame: the export, the
    //    criteria, Run, the workflow at work, then its results. ───────────────────
    const run = screen('run');
    colorWipe(tl, wipes, {
      cover: B(RUN_BAR),
      from: 'bottom',
      colors: ['--cat-support-2', '--cat-support', '--ground'],
      step: 70,
    });
    settle(tl, [q('.rv-shot', run)], { at: B(RUN_BAR), from: 1.05, duration: 1000 });
    const foot = q('.rv-foot', run);
    footage(tl, foot, { at: B(RUN_BAR) });
    // A camera inside the card: close on the form while it is filled in (the
    // UI reads at phone size), then out to the whole run as it works.
    const shotBox = { width: 1000, height: 688 };
    const FORM_TOP = { x: 516, y: 262, s: 1.34 };
    const FORM_MID = { x: 516, y: 350, s: 1.34 };
    const FORM_RUN = { x: 516, y: 431, s: 1.34 };
    const WHOLE = { x: 500, y: 344, s: 1 };
    // Hold on the upload, glide down to the criteria as they are pasted, then
    // on down to the Run button and hold for the click.
    frame(tl, foot, { at: B(RUN_BAR), duration: 1, from: FORM_TOP, to: FORM_TOP, ...shotBox });
    frame(tl, foot, {
      at: F(UPLOAD_AT + 0.4),
      duration: F(PASTE_AT + 0.2) - F(UPLOAD_AT + 0.4),
      from: FORM_TOP,
      to: FORM_MID,
      easing: ease.travel,
      ...shotBox,
    });
    frame(tl, foot, {
      at: F(PASTE_AT + 0.5),
      duration: F(RUN_AT - 0.5) - F(PASTE_AT + 0.5),
      from: FORM_MID,
      to: FORM_RUN,
      easing: ease.travel,
      ...shotBox,
    });
    frame(tl, foot, { at: F(RUN_AT), duration: 900, from: FORM_RUN, to: WHOLE, ...shotBox });
    // One line per step of the real run, swapped as the footage reaches it.
    const caps = all('.rv-cap', run);
    const capAt = [B(RUN_BAR) + 80, F(PASTE_AT - 0.3), F(RUN_AT), RESULT_AT];
    caps.forEach((cap, i) => {
      settle(tl, [cap], { at: capAt[i]!, from: i === 3 ? 1.2 : 1.15, duration: 850 });
      const next = capAt[i + 1];
      if (next !== undefined) vanish(tl, [cap], { at: next - 200 });
    });
    settle(tl, [q('.rv-live', run)], { at: B(RUN_BAR, 1), from: 1.1, duration: 900 });
    creep(tl, run, { at: B(RUN_BAR), duration: B(SHEET_BAR) - B(RUN_BAR), to: 1.04 });

    // ── Bars 11–12 · The deliverable: every decision with its reason,
    //    arriving one row at a time, each verdict stamped. ───
    const sheet = screen('sheet');
    colorWipe(tl, wipes, {
      cover: B(SHEET_BAR),
      from: 'right',
      colors: ['--cat-data-2', '--cat-data', '--ground'],
      step: 70,
    });
    const [sheetA, sheetB] = all('.row', sheet);
    settle(tl, all('.w', sheetA!), { at: B(SHEET_BAR), from: 1.2 });
    settle(tl, all('.w', sheetB!), { at: B(SHEET_BAR, 0.5), from: 1.2 });
    const card = q('.rv-sheet', sheet);
    settle(tl, [card], { at: B(SHEET_BAR, 0.5), from: 1.06, duration: 1000 });
    // Each decision arrives on its own: the row slides in, then its
    // verdict is stamped.
    settle(tl, [q('.rv-sheet-head', card)], {
      at: B(SHEET_BAR, 0.75),
      from: 1.08,
      duration: 700,
    });
    const rows = all('.rv-row', sheet);
    rows.forEach((row, i) => {
      const at = B(SHEET_BAR, 1) + i * ROW_STEP;
      flyIn(tl, row, { at, x: 160, scale: 1.04, duration: 750 });
      stamp(tl, [q('.rv-d b', row)], { at: at + 260, tilt: 0 });
    });
    settle(tl, [q('.rv-file', sheet)], { at: B(SHEET_BAR + 1, 2.5), from: 1.1, duration: 900 });
    creep(tl, sheet, { at: B(SHEET_BAR), duration: B(PRISMA_BAR) - B(SHEET_BAR), to: 1.04 });

    // ── Bars 13–14 · PRISMA 2020: the flow draws itself box by box and
    //    every count is counted. ────────────────────────────────────────
    const prisma = screen('prisma');
    irisWipe(tl, wipes, {
      cover: B(PRISMA_BAR),
      x: W / 2,
      y: H / 2,
      width: W,
      height: H,
      colors: ['--cat-research', '--cat-research-2', '--ground'],
    });
    const [prA, prB] = all('.row', prisma);
    settle(tl, all('.w', prA!), { at: B(PRISMA_BAR), from: 1.2 });
    settle(tl, all('.w', prB!), { at: B(PRISMA_BAR, 0.5), from: 1.2 });
    const boxes = all('.rv-box', flow);
    const links = all('.rv-link', flow);
    // Box i lands at its slot; the connector into it draws just before.
    const boxAt = [0, 1, 1, 2, 2, 3, 3].map(
      (step, i) => B(PRISMA_BAR, 0.75 + step * 0.75) + (i % 2) * 120,
    );
    boxes.forEach((box, i) => {
      popIn(tl, [box], { at: boxAt[i]!, base: 0.7, duration: 700 });
      const num = q('b', box);
      countUp(tl, num, { to: Number(num.dataset.to), at: boxAt[i]! + 80, duration: 900 });
    });
    const linkAt = [1, 1, 3, 3, 5, 5, 5, 5].map((b, i) => boxAt[b]! - 260 + (i > 5 ? 80 : 0));
    links.forEach((link, i) => {
      grow(tl, [link], {
        at: linkAt[i]!,
        axis: link.classList.contains('h') ? 'x' : 'y',
        duration: 420,
      });
    });
    creep(tl, prisma, { at: B(PRISMA_BAR), duration: B(WOW_BAR) - B(PRISMA_BAR), to: 1.03 });

    // ── Bar 15 · What it gives back: the researcher sees it and lights
    //    up, on the beat. ───────────────────────────────────────────────
    const wow = screen('wow');
    colorWipe(tl, wipes, {
      cover: B(WOW_BAR),
      from: 'left',
      colors: ['--cat-marketing-2', '--cat-marketing', '--ground'],
      step: 70,
    });
    const [wowA, wowB] = all('.row', wow);
    settle(tl, all('.w', wowA!), { at: B(WOW_BAR), from: 1.2 });
    countUp(tl, q('.rv-n', wow), { to: SCREENED, at: B(WOW_BAR) + 60, duration: 900 });
    settle(tl, all('.w', wowB!), { at: B(WOW_BAR, 1), from: 1.25 });
    rise(tl, all('.rv-happy > svg > .pc', wow), {
      at: B(WOW_BAR),
      step: 70,
      distance: 120,
      duration: 900,
    });
    swap(tl, q('.rv-calm', wow), q('.rv-wowface', wow), { at: B(WOW_BAR, 1.5) });
    popIn(tl, all('.rv-spark', wow), {
      at: B(WOW_BAR, 1.5),
      step: 70,
      base: 0.1,
      duration: 600,
    });
    creep(tl, wow, { at: B(WOW_BAR), duration: B(CTA_BAR) - B(WOW_BAR), to: 1.04 });

    // ── Bars 16–17 · Where to run it. ────────────────────────────────
    const cta = screen('cta');
    colorWipe(tl, wipes, {
      cover: B(CTA_BAR),
      from: 'right',
      colors: ['--mesh-b', '--mesh-a', '--ground'],
      step: 70,
    });
    const logo = q('.logo', cta);
    const logoCentre = centreOf(logo, stage);
    const ripple = q('.ripple', cta);
    ripple.style.left = `${logoCentre.x}px`;
    ripple.style.top = `${logoCentre.y}px`;
    rings(tl, ripple, {
      at: B(CTA_BAR) - 60,
      until: B(CTA_BAR) + 700,
      every: 120,
      life: 2000,
      radius: 1150,
      easing: ease.expo,
      colors: [
        '--cat-support',
        '--cat-research',
        '--cat-marketing',
        '--cat-data',
        '--cat-design',
        '--cat-research-2',
      ],
    });
    popIn(tl, [logo], { at: B(CTA_BAR) - 20, base: 0.25, duration: 800 });
    rise(tl, splitChars(q('.rv-end', cta)), {
      at: B(CTA_BAR, 0.5),
      step: 26,
      distance: 50,
      duration: 800,
    });
    settle(tl, [q('.url', cta)], { at: B(CTA_BAR, 2), from: 1.1, duration: 900 });
    creep(tl, cta, { at: B(CTA_BAR), duration: DURATION - B(CTA_BAR), to: 1.03 });
  },

  /**
   * Its own record: A major and airy (I–V/7–vi–IV voiced wide), a plucked
   * arp that speeds up as the screening does, glassy ticks for every stamp,
   * a sung "ah" on the reaction. No crowd shouts, no vocal chops.
   */
  score(s) {
    const A = [57, 64, 69, 73];
    const E = [56, 64, 68, 71];
    const Fsm = [54, 61, 66, 69];
    const D = [50, 57, 62, 66];
    const prog = [A, E, Fsm, D];
    const lead = (cover: number) => cover - 500;

    // Bars 1–2 · Pad and a slow pluck, papers rustling past.
    s.pads(B(HOOK_BAR), B(PAIR_BAR), prog).arp(B(HOOK_BAR), B(PAIR_BAR), prog, 2);
    s.halftime(B(2), B(PAIR_BAR), { hats: false });
    s.hit(B(HOOK_BAR, 0.75)).hit(B(HOOK_BAR, 1.75));
    for (let i = 0; i < 10; i += 1)
      s.whoosh(B(HOOK_BAR) + i * 360, 260, i % 2 ? 'right' : 'left');
    s.riser(B(2), B(PAIR_BAR)).whoosh(lead(B(PAIR_BAR)), 900, 'left');

    // Bars 3–4 · The pulse arrives; a stamp per verdict.
    s.impact(B(PAIR_BAR), 0.8).subdrop(B(PAIR_BAR));
    s.halftime(B(PAIR_BAR), B(TITLE_BAR)).bassline(B(PAIR_BAR), B(TITLE_BAR), prog);
    s.pads(B(PAIR_BAR), B(TITLE_BAR), prog).arp(B(PAIR_BAR), B(TITLE_BAR), prog, 4);
    s.pop(B(PAIR_BAR, 0.25) + 60, 81).pop(B(PAIR_BAR, 0.25) + 180, 85);
    for (let i = 0; i < 3; i += 1) {
      const at = B(PAIR_BAR, 1.5) + i * BEAT * 0.9;
      s.hit(at + 280)
        .tick(at + 290, 98)
        .hit(at + 430)
        .tick(at + 440, 101);
      s.pop(at + 400, 88 + i * 3);
    }
    s.sparkle(lead(B(TITLE_BAR)) + 380).whoosh(lead(B(TITLE_BAR)), 900, 'right');

    // Bar 5 · The name: impact, the scan line as a glassy sweep.
    s.impact(B(TITLE_BAR), 1).subdrop(B(TITLE_BAR));
    s.stabs(B(TITLE_BAR), B(RUN_BAR), prog, 0.8).bassline(B(TITLE_BAR), B(RUN_BAR), prog);
    s.whoosh(B(TITLE_BAR) + 60, 900, 'left').sparkle(B(TITLE_BAR) + 500);
    s.pop(B(TITLE_BAR, 2) + 40, 88).whoosh(lead(B(RUN_BAR)), 900, 'left');

    // Bars 6–10 · The run: the groove under it; a tick when the export lands,
    // keys on the paste, a click on Run, a hush of halftime while it works,
    // a rise into the results on the bar-10 downbeat.
    s.impact(B(RUN_BAR), 0.7).subdrop(B(RUN_BAR));
    s.groove(B(RUN_BAR), F(RUN_AT)).bassline(B(RUN_BAR), B(SHEET_BAR), prog);
    s.pads(B(RUN_BAR), B(SHEET_BAR), prog).arp(B(RUN_BAR), B(SHEET_BAR), prog, 4);
    s.halftime(F(RUN_AT), RESULT_AT, { hats: true });
    s.tick(F(UPLOAD_AT), 93).pop(F(UPLOAD_AT) + 30, 86);
    for (let k = 0; k < 4; k += 1) s.key(F(PASTE_AT) + 120 + k * 70);
    s.tick(F(RUN_AT) - 40, 100).pop(F(RUN_AT), 91);
    s.riser(F(RUN_AT) + 600, RESULT_AT).roll(RESULT_AT - 1000, RESULT_AT);
    s.impact(RESULT_AT, 1)
      .subdrop(RESULT_AT)
      .sparkle(RESULT_AT - 80, 'right');
    s.groove(RESULT_AT, B(SHEET_BAR));
    s.whoosh(lead(B(SHEET_BAR)), 900, 'right');

    // Bars 11–12 · The sheet: a whoosh and a stamp per row as it lands.
    s.impact(B(SHEET_BAR), 0.8).subdrop(B(SHEET_BAR));
    s.groove(B(SHEET_BAR), B(PRISMA_BAR)).bassline(B(SHEET_BAR), B(PRISMA_BAR), prog);
    s.stabs(B(SHEET_BAR), B(PRISMA_BAR), prog, 0.7).arp(B(SHEET_BAR), B(PRISMA_BAR), prog, 4);
    for (let i = 0; i < SHEET.length; i += 1) {
      const at = B(SHEET_BAR, 1) + i * ROW_STEP;
      s.whoosh(at - 120, 300, 'right');
      s.hit(at + 380).tick(at + 390, 96 + ((i * 3) % 9));
    }
    s.sparkle(lead(B(PRISMA_BAR)) + 380).whoosh(lead(B(PRISMA_BAR)), 900);

    // Bars 13–14 · PRISMA: a pop per box, ticks under the counting.
    s.impact(B(PRISMA_BAR), 0.9).subdrop(B(PRISMA_BAR));
    s.halftime(B(PRISMA_BAR), B(WOW_BAR)).bassline(B(PRISMA_BAR), B(WOW_BAR), prog);
    s.pads(B(PRISMA_BAR), B(WOW_BAR), prog).arp(B(PRISMA_BAR), B(WOW_BAR), prog, 4);
    [0, 1, 1, 2, 2, 3, 3].forEach((step, i) => {
      const at = B(PRISMA_BAR, 0.75 + step * 0.75) + (i % 2) * 120;
      s.pop(at + 40, 84 + i * 2);
      for (let k = 0; k < 4; k += 1) s.tick(at + 140 + k * 140, 98 + k);
    });
    s.riser(B(PRISMA_BAR + 1, 2), B(WOW_BAR))
      .roll(B(PRISMA_BAR + 1, 2), B(WOW_BAR))
      .whoosh(lead(B(WOW_BAR)), 900, 'left');

    // Bar 15 · The reaction: impact, the sung "ah", sparkles.
    s.impact(B(WOW_BAR), 1).subdrop(B(WOW_BAR));
    s.groove(B(WOW_BAR), B(CTA_BAR)).bassline(B(WOW_BAR), B(CTA_BAR), prog);
    s.stabs(B(WOW_BAR), B(CTA_BAR), prog, 0.8);
    s.add({ kind: 'vox', at: B(WOW_BAR, 1.5), note: 76, vowel: 'oh', len: 900 });
    s.sparkle(B(WOW_BAR, 1.5) - 40).sparkle(B(WOW_BAR, 2), 'right');
    s.whoosh(lead(B(CTA_BAR)), 900, 'right');

    // Bars 16–17 · Resolve on A and ring out.
    s.impact(B(CTA_BAR), 1.15)
      .subdrop(B(CTA_BAR))
      .sparkle(B(CTA_BAR) - 80);
    s.add({
      kind: 'pad',
      at: B(CTA_BAR),
      notes: [45, 57, 64, 69, 71, 73, 76],
      len: DURATION - B(CTA_BAR) - 400,
    });
    s.add({ kind: 'stab', at: B(CTA_BAR), notes: [64, 69, 73, 76], len: 900 });
    s.arp(B(CTA_BAR), B(CTA_BAR + 1), [A], 2);
    for (let i = 0; i < 7; i += 1) s.pop(B(CTA_BAR + 1, i * 0.25), 85 + ((i * 5) % 12));
  },

  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((node) => {
      node.style.opacity = node.dataset.screen === 'cta' ? '1' : '0';
    });
  },
});
