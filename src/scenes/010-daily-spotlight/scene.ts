import {
  barAt,
  breathe,
  cameraPush,
  colorWipe,
  converge,
  creep,
  drift,
  ease,
  flyIn,
  gridMap,
  holdScreen,
  irisWipe,
  mountStage,
  offsetTo,
  orbit,
  popIn,
  rings,
  rise,
  settle,
  slideFrom,
  splitChars,
  strobe,
  typeCamera,
  typeOn,
  vanish,
  zoomThrough,
} from '../../lib/index';

/**
 * 010 — Daily Workflow Spotlight. A 30s launch film for LinkedIn, X and
 * Instagram: light ground, colour everywhere, type that is simply there and
 * settles into focus, colour wipes on the downbeats.
 *
 * Every time below is a bar and beat on MAP, never a raw millisecond. The
 * synthesized score is 120bpm, so MAP is an exact grid. To cut to a
 * licensed track instead: drop it in src/assets/music/launch.mp3, run
 * `npm run beats -- music/launch`, read launch.beats.md, then replace MAP with
 *   import MAP from '../../assets/music/launch.beats.json';
 * and add `music: { slot: 'music/launch' }` to mountStage. The storyboard
 * re-times itself to the track's real beats.
 */
const DURATION = 30000;
const BPM = 120;
const MAP = gridMap(BPM, DURATION, {
  source: '010 score · 120bpm',
  energy: [0.3, 0.45, 0.7, 0.8, 1, 1, 1, 1, 1, 1, 1, 0.4, 0.75, 0.95, 0.5],
});

/** Bar n (1-based), beat b (0-based, fractions allowed), in ms. */
const B = (bar: number, beat = 0) => barAt(MAP, bar, beat);
const EIGHTH = B(1, 0.5) - B(1);

const CATS = ['marketing', 'sales', 'engineering', 'research', 'content', 'finance'] as const;
const CAT_BAR = 5; // categories run bars 5–10, one bar each
const WIPE_DIR = ['left', 'bottom', 'right', 'top', 'left', 'bottom'] as const;
/** Categories alternate: an iris out of the illustration, then a sweep. */
const IRIS = [true, false, true, false, true, false] as const;
const TITLE_TEXT = 'Daily Workflow Spotlight';
const TYPE_STEP = 55;
const PIECE_STEP = 125;

const TITLE_BAR = 3;
const MONTAGE_BAR = 11;
const DAILY_BAR = 12;
const WHERE_BAR = 13;
const END_BAR = 14;

mountStage({
  width: 1920,
  height: 1080,
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
    const cats = all('.screen.cat');

    cameraPush(tl, q('.camera'), { duration: DURATION, to: 1.03 });

    // The river on every white screen: two ribbons sliding opposite ways,
    // so the colours flow through each other for the whole film.
    all('.river').forEach((river) => {
      [...river.children].forEach((ribbon, i) => {
        drift(tl, ribbon, { duration: DURATION, dx: i ? -700 : 700, dy: i ? -10 : 10 });
      });
    });

    // Who owns the frame, and when. Each screen is declared exactly once;
    // the cuts sit under wipe covers, at the end of the zoom, or on downbeats.
    const reel: [HTMLElement, number][] = [
      [screen('intro'), B(1)],
      [screen('title'), B(TITLE_BAR)],
      ...cats.map((cat, i): [HTMLElement, number] => [cat, B(CAT_BAR + i)]),
      [screen('montage'), B(MONTAGE_BAR)],
      [screen('daily'), B(DAILY_BAR)],
      [screen('where'), B(WHERE_BAR)],
      [screen('end'), B(END_BAR)],
    ];
    reel.forEach(([el, at], i) => holdScreen(tl, el, { at, until: reel[i + 1]?.[1] }));

    // ── Bars 1–2 · "Introducing" is there from the first frame, the lens
    //    pushes in, then accelerates through the "o" while rings stream
    //    out of its counter toward the lens. ───────────────────────────
    const intro = screen('intro');
    settle(tl, [q('.kin', intro)], { at: 0, from: 1.12, duration: 1800 });
    creep(tl, intro, { at: 0, duration: B(2, 1), to: 1.07 });
    const counter = zoomThrough(tl, q('.zoom', intro), q('.o', intro), {
      at: B(2, 1),
      duration: B(TITLE_BAR) - B(2, 1),
      to: 90,
    });
    const ringHost = q('.rings', intro);
    ringHost.style.left = `${counter.x}px`;
    ringHost.style.top = `${counter.y}px`;
    rings(tl, ringHost, {
      at: B(1, 3),
      until: B(TITLE_BAR),
      every: EIGHTH / 2,
      life: 1100,
      radius: 50,
      colors: [
        '--cat-support',
        '--cat-research',
        '--cat-marketing',
        '--cat-sales',
        '--cat-finance',
        '--cat-engineering',
      ],
    });

    // ── Bars 3–4 · On plain white, the title types with the lens close on
    //    the caret, then pulls all the way back to the lockup. ──────────
    const title = screen('title');
    const line = q('.kin.title', title);
    const chars = splitChars(line);
    const typeAt = B(TITLE_BAR) + 120;
    const pullBack = B(TITLE_BAR, 3);
    const typed = typeOn(tl, chars, {
      at: typeAt,
      step: TYPE_STEP,
      caret: q<HTMLElement>('.caret', line),
      caretOff: pullBack + 300,
    });
    typeCamera(tl, q('.emerge', title), chars[0]!, chars[chars.length - 1]!, {
      at: typeAt,
      until: typed,
      release: pullBack,
      scale: 2.7,
      back: 1500,
    });
    settle(tl, [q('.logo', title)], { at: pullBack + 200, from: 0.7, duration: 1100 });
    creep(tl, title, { at: B(TITLE_BAR), duration: B(CAT_BAR) - B(TITLE_BAR), to: 1.03 });

    // ── Bars 5–10 · One category per bar. Each arrives by iris or sweep,
    //    its name cascades in letter by letter, its illustration turns
    //    slowly in space over a breathing orb of its own colour. ─────────
    cats.forEach((cat, i) => {
      const bar = CAT_BAR + i;
      const key = CATS[i];
      const right = q('.il', cat).dataset.side === 'right';
      if (IRIS[i]) {
        irisWipe(tl, wipes, {
          cover: B(bar),
          x: right ? 1460 : 460,
          y: 540,
          colors: [`--cat-${key}`, `--cat-${key}-2`, '--ground'],
        });
      } else {
        colorWipe(tl, wipes, {
          cover: B(bar),
          from: WIPE_DIR[i],
          colors: [`--cat-${key}-2`, `--cat-${key}`, '--ground'],
          step: 70,
        });
      }
      creep(tl, cat, { at: B(bar), duration: B(bar + 1) - B(bar), to: 1.03 });
      const name = q('.copy .kin', cat);
      rise(tl, splitChars(name), { at: B(bar), step: 28, distance: 70, duration: 850 });
      settle(tl, [q('.desc', cat)], { at: B(bar, 0.75), from: 1.08, duration: 900 });
      rise(tl, all('.pc', cat), {
        at: B(bar, 0.25),
        step: PIECE_STEP,
        distance: 120,
        duration: 950,
      });
      orbit(tl, q('.il', cat), {
        at: B(bar),
        duration: B(bar + 1) - B(bar),
        yaw: right ? [-12, 3] : [12, -3],
        pitch: [6, -2],
        dy: [26, -14],
      });
      breathe(tl, q('.orb', cat), {
        at: B(bar),
        duration: B(bar + 1) - B(bar),
        from: 0.8,
        mid: 1.12,
        to: 1.02,
        peak: 0.7,
        rest: 0.55,
      });
    });

    // ── Bar 11 · Montage, one category per 8th. ─────────────────────
    const montage = screen('montage');
    colorWipe(tl, wipes, {
      cover: B(MONTAGE_BAR),
      colors: ['--cat-support-2', '--cat-support', '--ground'],
      from: 'right',
      step: 70,
    });
    strobe(tl, all('.mt', montage), { at: B(MONTAGE_BAR), step: EIGHTH });

    // ── Bar 12 · Hard cut. The music drops out; two lines. ──────────
    const daily = screen('daily');
    const [lineA, lineB] = all('.row', daily);
    settle(tl, all('.w', lineA!), { at: B(DAILY_BAR), step: 90, from: 1.3 });
    settle(tl, all('.w', lineB!), { at: B(DAILY_BAR, 2), step: 90, from: 1.3 });
    creep(tl, daily, { at: B(DAILY_BAR), duration: B(WHERE_BAR) - B(DAILY_BAR), to: 1.05 });

    // ── Bar 13 · Where. Each platform is thrown in from in front of the
    //    lens, then gets its unread badge: a new post lands there daily. ──
    const where = screen('where');
    irisWipe(tl, wipes, {
      cover: B(WHERE_BAR),
      x: 960,
      y: 540,
      colors: ['--cat-ops', '--cat-ops-2', '--mesh-b', '--ground'],
      step: 70,
    });
    const plats = all('.plat', where);
    const tiles = all('.tile', where);
    const BEAT = B(1, 1) - B(1);
    // Measured at rest, so added before anything else moves the tiles.
    converge(tl, tiles, {
      at: B(WHERE_BAR, 3),
      toward: where,
      duration: B(END_BAR) - B(WHERE_BAR, 3),
      scale: 0.26,
    });
    settle(tl, [q('.kicker', where)], { at: B(WHERE_BAR), from: 1.15, duration: 900 });
    plats.forEach((plat, i) => {
      const side = i - 1;
      flyIn(tl, plat, {
        at: B(WHERE_BAR, i * 0.5),
        x: side * 340,
        y: 240,
        rotate: side * 16,
        scale: 2.4,
        duration: 950,
      });
    });
    popIn(tl, all('.badge', where), {
      at: B(WHERE_BAR, 2),
      step: BEAT / 3,
      base: 0.2,
      duration: 500,
    });
    vanish(tl, [q('.kicker', where), ...all('figcaption', where)], { at: B(WHERE_BAR, 3) });
    creep(tl, where, { at: B(WHERE_BAR), duration: B(END_BAR) - B(WHERE_BAR), to: 1.04 });

    // ── Bars 14–15 · The three marks meet in the middle; a ripple bursts
    //    out of the point and the Edgaze mark is born there, then glides
    //    home while the title unfolds out of it. ───────────────────────
    const end = screen('end');
    const lockup = q('.lk', end);
    const logo = q('.logo', end);
    const home = offsetTo(logo, end);
    const ripple = q('.ripple', end);
    ripple.style.left = '960px';
    ripple.style.top = '540px';
    rings(tl, ripple, {
      at: B(END_BAR) - 60,
      until: B(END_BAR) + 700,
      every: 120,
      life: 2000,
      radius: 1150,
      easing: ease.expo,
      colors: [
        '--cat-engineering',
        '--cat-research',
        '--cat-marketing',
        '--cat-sales',
        '--cat-finance',
        '--cat-support',
      ],
    });
    popIn(tl, [logo], { at: B(END_BAR) - 20, base: 0.25, duration: 800 });
    slideFrom(tl, lockup, { at: B(END_BAR, 0.6), x: home.x, y: home.y, duration: 1300 });
    rise(tl, splitChars(q('.kin.end', end)), {
      at: B(END_BAR, 0.9),
      step: 26,
      distance: 50,
      duration: 800,
    });
    settle(tl, [q('.url', end)], { at: B(END_BAR, 2.25), from: 1.1, duration: 900 });
    popIn(tl, all('.confetti i', end), { at: B(END_BAR + 1), step: EIGHTH / 2, base: 0.1 });
    creep(tl, end, { at: B(END_BAR), duration: DURATION - B(END_BAR), to: 1.03 });
  },

  /**
   * The soundtrack, cut to the same MAP. Music layers carry the energy
   * curve; sfx sit on the exact frames the picture changes.
   */
  score(s) {
    const F = [53, 57, 60, 64];
    const C = [48, 55, 64, 67];
    const G = [55, 59, 62, 67];
    const Am = [57, 60, 64, 67];
    const prog = [F, C, G, Am];
    const lead = (cover: number) => cover - 500; // whoosh peaks on the cover

    // Intro, bars 1–2: wide pad, vocal hook filtered in, then the lens
    // accelerates through the "o" on a long rising whoosh.
    s.pads(B(1), B(TITLE_BAR), prog).hook(B(1), B(TITLE_BAR), { gain: 0.6 });
    s.hit(B(1));
    s.riser(B(2), B(TITLE_BAR)).whoosh(B(2, 1), B(TITLE_BAR) - B(2, 1) + 300);
    s.shout(B(2, 3.5));

    // Title, bars 3–4: impact, stabs and bass; kicks rebuild, a roll, "hey".
    s.impact(B(TITLE_BAR), 1);
    s.stabs(B(TITLE_BAR), B(CAT_BAR), prog).bassline(B(TITLE_BAR), B(CAT_BAR), prog);
    s.hook(B(TITLE_BAR), B(CAT_BAR));
    s.pulse(B(4), B(CAT_BAR), 0.8).roll(B(4, 2), B(CAT_BAR));
    // One key click per typed letter, then a shimmer as the lens pulls back.
    const keys = TITLE_TEXT.replace(/\s/g, '').length;
    for (let i = 0; i < keys; i += 1) s.key(B(TITLE_BAR) + 120 + i * TYPE_STEP);
    s.whoosh(B(TITLE_BAR, 3) - 150, 1200, 'right').sparkle(B(TITLE_BAR, 3) + 250);
    s.subdrop(B(TITLE_BAR));
    s.shout(B(4, 3.5));

    // Categories, bars 5–10: everything.
    s.impact(B(CAT_BAR), 0.7).subdrop(B(CAT_BAR));
    s.groove(B(CAT_BAR), B(MONTAGE_BAR)).bassline(B(CAT_BAR), B(MONTAGE_BAR), prog);
    s.stabs(B(CAT_BAR), B(MONTAGE_BAR), prog).hook(B(CAT_BAR), B(MONTAGE_BAR));
    s.pads(B(CAT_BAR), B(MONTAGE_BAR), prog);
    for (let i = 0; i < 6; i += 1) {
      const bar = CAT_BAR + i;
      s.whoosh(lead(B(bar)), 900, WIPE_DIR[i] === 'right' ? 'right' : 'left');
      if (IRIS[i]) s.sparkle(B(bar) - 120, i % 2 ? 'left' : 'right');
      [84, 88, 91, 96].forEach((note, k) => s.pop(B(bar, 0.25) + k * PIECE_STEP + 60, note));
    }

    // Montage, bar 11: roll, rise, a tick per flash, "hey" into the drop.
    s.whoosh(lead(B(MONTAGE_BAR)), 900, 'right');
    s.groove(B(MONTAGE_BAR), B(DAILY_BAR), { claps: false }).roll(B(MONTAGE_BAR), B(DAILY_BAR));
    s.bassline(B(MONTAGE_BAR), B(DAILY_BAR), prog).riser(B(MONTAGE_BAR), B(DAILY_BAR));
    for (let i = 0; i < 8; i += 1) s.tick(B(MONTAGE_BAR, i * 0.5), 84 + i * 2);
    s.shout(B(MONTAGE_BAR, 3.5));

    // Bar 12: everything drops out but the pad and the voice.
    s.impact(B(DAILY_BAR), 0.8).subdrop(B(DAILY_BAR));
    s.pads(B(DAILY_BAR), B(WHERE_BAR), prog).hook(B(DAILY_BAR), B(WHERE_BAR), { gain: 0.8 });
    s.hit(B(DAILY_BAR, 0)).hit(B(DAILY_BAR, 2));

    // Bar 13: kicks and stabs on every platform, build into the last drop.
    s.pulse(B(WHERE_BAR), B(END_BAR), 0.9).bassline(B(WHERE_BAR), B(END_BAR), prog);
    s.stabs(B(WHERE_BAR), B(END_BAR), prog).riser(B(WHERE_BAR), B(END_BAR));
    // A short whoosh and a landing thud per platform, a ding per badge,
    // then a long pull as the three marks are drawn together.
    for (let i = 0; i < 3; i += 1) {
      s.whoosh(B(WHERE_BAR, i * 0.5) - 260, 420, i === 2 ? 'right' : 'left');
      s.hit(B(WHERE_BAR, i * 0.5) + 120).pop(B(WHERE_BAR, i * 0.5) + 140, 84 + i * 4);
      s.tick(B(WHERE_BAR, 2 + i / 3), 100 + i * 3).pop(
        B(WHERE_BAR, 2 + i / 3) + 20,
        96 + i * 3,
      );
    }
    s.whoosh(B(WHERE_BAR, 3) - 100, 1100, 'right');
    s.sparkle(B(WHERE_BAR) - 100);
    s.whoosh(lead(B(END_BAR)), 900).shout(B(WHERE_BAR, 3.5));

    // Bars 14–15: final impact, resolve to C, one last stab, let it ring.
    s.impact(B(END_BAR), 1.15)
      .subdrop(B(END_BAR))
      .sparkle(B(END_BAR) - 80);
    s.add({
      kind: 'pad',
      at: B(END_BAR),
      notes: [48, 55, 60, 64, 67, 72],
      len: DURATION - B(END_BAR) - 400,
    });
    s.add({ kind: 'stab', at: B(END_BAR), notes: [60, 64, 67, 72], len: 900 });
    s.add({ kind: 'vox', at: B(END_BAR, 0.5), note: 72, vowel: 'ah', len: 1800 });
    for (let i = 0; i < 13; i += 1) s.pop(B(END_BAR + 1, i * 0.25), 84 + ((i * 5) % 14));
  },

  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
      el.style.opacity = el.dataset.screen === 'end' ? '1' : '0';
    });
    stage.querySelectorAll<HTMLElement>('[data-screen="end"] .confetti i').forEach((el) => {
      el.style.opacity = '1';
    });
  },
});
