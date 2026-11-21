import {
  barAt,
  breathe,
  cameraPush,
  colorWipe,
  converge,
  countUp,
  creep,
  drift,
  ease,
  flyIn,
  footage,
  gridMap,
  holdScreen,
  irisWipe,
  mountStage,
  orbit,
  popIn,
  rings,
  rise,
  settle,
  splitChars,
  vanish,
} from '../../lib/index';

/**
 * 012 — Workflow Spotlight: "Cinematic Skincare Advertisements" by Murphy AI
 * (@Diplomeme). A 30s vertical film for X, Reels and Shorts, outcome first:
 * the ads, the workflow's name, the real run, what it makes, who made it,
 * where to run it. Same look and score language as 010/011.
 *
 * The run is real footage: a Studio test run recorded in the app in light
 * mode (src/assets/videos/012-run.mp4, 8s, cut so the finished ad appears at
 * exactly 6.0s). footage() drives it from the timeline, so the ad lands on
 * the bar-8 downbeat in preview and in the frame-stepped export alike.
 *
 * Every time below is a bar and beat on MAP, never a raw millisecond.
 */
const DURATION = 30000;
const W = 1080;
const H = 1920;
const BPM = 120;
const MAP = gridMap(BPM, DURATION, {
  source: '012 score · 120bpm',
  energy: [0.55, 0.7, 0.8, 0.85, 1, 1, 1, 1, 1, 1, 0.6, 0.75, 1, 0.8, 0.5],
});

/** Bar n (1-based), beat b (0-based, fractions allowed), in ms. */
const B = (bar: number, beat = 0) => barAt(MAP, bar, beat);
const BEAT = B(1, 1) - B(1);

const HOOK_BAR = 1;
const TITLE_BAR = 3;
const RUN_BAR = 5;
const LAND_BAR = 8; // the finished ad appears in the footage
const GALLERY_BAR = 9;
const CREATOR_BAR = 11;
const CTA_BAR = 13;

/** Footage clock: seconds into 012-run.mp4 → scene ms. */
const F = (sec: number) => B(RUN_BAR) + sec * 1000;
/** In the cut, typing plays at 2×; each field starts here and types this many chars. */
const FIELDS = [
  { at: 0.4, chars: 7 },
  { at: 1.42, chars: 31 },
  { at: 3.02, chars: 22 },
];
const FOOT_KEY = 38; // ms per typed char in the 2× cut
const RUN_CLICK = 4.92; // "Run workflow" pressed
const AD_LANDS = 6.0; // must equal LAND_BAR

const CARD_STEP = BEAT / 2;

/** Centre of an element in stage coordinates, measured at rest. */
const centreOf = (el: HTMLElement, stage: HTMLElement) => {
  const a = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const k = s.width / W;
  return { x: (a.left + a.width / 2 - s.left) / k, y: (a.top + a.height / 2 - s.top) / k };
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

    if (F(AD_LANDS) !== B(LAND_BAR)) throw new Error('012: the ad must land on bar 8');

    cameraPush(tl, q('.camera'), { duration: DURATION, to: 1.03 });
    all('.river').forEach((river) => {
      [...river.children].forEach((ribbon, i) => {
        drift(tl, ribbon, { duration: DURATION, dx: i ? -700 : 700, dy: i ? -10 : 10 });
      });
    });

    const reel: [HTMLElement, number][] = [
      [screen('hook'), B(HOOK_BAR)],
      [screen('title'), B(TITLE_BAR)],
      [screen('run'), B(RUN_BAR)],
      [screen('gallery'), B(GALLERY_BAR)],
      [screen('creator'), B(CREATOR_BAR)],
      [screen('cta'), B(CTA_BAR)],
    ];
    reel.forEach(([el, at], i) => holdScreen(tl, el, { at, until: reel[i + 1]?.[1] }));

    // ── Bars 1–2 · Outcome first. Five finished ads are thrown in from in
    //    front of the lens, one per eighth, and land in a fan; the promise
    //    settles in above them. ──────────────────────────────────────────
    const hook = screen('hook');
    const fan = q('.sk-fan', hook);
    const slots = all('.sk-slot', hook);
    // Measured at rest, so added before the fly-ins move the cards.
    converge(tl, all('.sk-ad', hook).reverse(), {
      at: B(2, 2.5),
      toward: fan,
      duration: B(TITLE_BAR) - B(2, 2.5),
      scale: 0.04,
      spin: 30,
    });
    vanish(tl, all('.row', hook), { at: B(2, 2.5), step: 60, duration: 420 });
    slots.forEach((slot, i) => {
      const x = parseFloat(slot.style.getPropertyValue('--x')) || 0;
      flyIn(tl, q('.sk-ad', slot), {
        at: B(HOOK_BAR) + i * CARD_STEP,
        x: x * 0.7,
        y: 360,
        rotate: x ? Math.sign(x) * 14 : -6,
        scale: 2.3,
        duration: 950,
      });
    });
    const [hookA, hookB] = all('.row', hook);
    settle(tl, all('.w', hookA!), { at: B(HOOK_BAR, 2.25), from: 1.25 });
    settle(tl, all('.w', hookB!), { at: B(HOOK_BAR, 3), from: 1.25 });
    orbit(tl, fan, {
      at: B(HOOK_BAR),
      duration: B(TITLE_BAR) - B(HOOK_BAR),
      yaw: [10, -6],
      pitch: [6, -2],
      dy: [20, -10],
    });
    creep(tl, hook, { at: B(HOOK_BAR), duration: B(TITLE_BAR) - B(HOOK_BAR), to: 1.04 });

    // ── Bars 3–4 · The ads collapse into one point; on the downbeat the
    //    workflow's name blooms out of it, letters from the centre outward,
    //    on a ripple of colour. The byline settles in under it. ─────────
    const title = screen('title');
    const name = q('.kin.sk-title', title);
    const letters = splitChars(name);
    const mid = name.offsetWidth / 2;
    const fromCentre = [...letters].sort(
      (p, r) =>
        Math.abs(p.offsetLeft + p.offsetWidth / 2 - mid) +
        p.offsetTop * 0.4 -
        (Math.abs(r.offsetLeft + r.offsetWidth / 2 - mid) + r.offsetTop * 0.4),
    );
    popIn(tl, fromCentre, { at: B(TITLE_BAR) - 20, step: 28, base: 0.15, duration: 900 });
    settle(tl, [name], { at: B(TITLE_BAR) - 20, from: 1.18, duration: 1600 });
    const bloom = q('.sk-bloom', title);
    const nameCentre = centreOf(name, stage);
    bloom.style.left = `${nameCentre.x}px`;
    bloom.style.top = `${nameCentre.y}px`;
    rings(tl, bloom, {
      at: B(TITLE_BAR) - 60,
      until: B(TITLE_BAR) + 500,
      every: 110,
      life: 1800,
      radius: 1100,
      easing: ease.expo,
      colors: ['--cat-support', '--mesh-b', '--cat-research', '--mesh-c', '--cat-marketing'],
    });
    settle(tl, [q('.sk-kicker', title)], { at: B(TITLE_BAR, 1), from: 1.12, duration: 900 });
    settle(tl, [q('.sk-by', title)], { at: B(TITLE_BAR, 2), from: 1.12, duration: 1000 });
    creep(tl, title, { at: B(TITLE_BAR), duration: B(RUN_BAR) - B(TITLE_BAR), to: 1.04 });

    // ── Bars 5–8 · The real run. One short line per step; the finished ad
    //    lands on the bar-8 downbeat and a ripple of colour breaks out
    //    behind the shot. ───────────────────────────────────────────────
    const run = screen('run');
    colorWipe(tl, wipes, {
      cover: B(RUN_BAR),
      from: 'bottom',
      colors: ['--cat-support-2', '--cat-support', '--ground'],
      step: 70,
    });
    const shot = q('.sk-shot', run);
    settle(tl, [shot], { at: B(RUN_BAR), from: 1.06, duration: 1000 });
    footage(tl, q('.sk-foot', run), { at: B(RUN_BAR) });
    const [capType, capRun, capGet] = all('.sk-cap', run);
    settle(tl, [capType!], { at: B(RUN_BAR) + 100, from: 1.15, duration: 900 });
    vanish(tl, [capType!], { at: F(RUN_CLICK) - 260 });
    settle(tl, [capRun!], { at: F(RUN_CLICK) - 60, from: 1.15, duration: 800 });
    vanish(tl, [capRun!], { at: B(LAND_BAR) - 220 });
    settle(tl, [capGet!], { at: B(LAND_BAR), from: 1.2, duration: 900 });
    settle(tl, [q('.sk-live', run)], { at: B(RUN_BAR, 1), from: 1.1, duration: 900 });
    rings(tl, q('.sk-burst', run), {
      at: B(LAND_BAR) - 60,
      until: B(LAND_BAR) + 600,
      every: 110,
      life: 1700,
      radius: 820,
      easing: ease.expo,
      colors: ['--cat-support', '--mesh-a', '--cat-research', '--mesh-c', '--cat-support-2'],
    });
    creep(tl, run, { at: B(RUN_BAR), duration: B(GALLERY_BAR) - B(RUN_BAR), to: 1.05 });

    // ── Bars 9–10 · What it makes: the ads ride past on a belt. ────────
    const gallery = screen('gallery');
    colorWipe(tl, wipes, {
      cover: B(GALLERY_BAR),
      from: 'right',
      colors: ['--cat-marketing-2', '--cat-marketing', '--ground'],
      step: 70,
    });
    const [galA, galB] = all('.row', gallery);
    settle(tl, all('.w', galA!), { at: B(GALLERY_BAR), from: 1.25 });
    settle(tl, all('.w', galB!), { at: B(GALLERY_BAR, 1.25), from: 1.25 });
    const belt = q('.sk-belt', gallery);
    popIn(tl, all('.sk-tile', gallery), { at: B(GALLERY_BAR, 0.25), step: 110, base: 0.8 });
    drift(tl, belt, {
      at: B(GALLERY_BAR),
      duration: B(CREATOR_BAR) - B(GALLERY_BAR) + 200,
      dx: -1220,
      dy: 0,
    });
    creep(tl, gallery, {
      at: B(GALLERY_BAR),
      duration: B(CREATOR_BAR) - B(GALLERY_BAR),
      to: 1.04,
    });

    // ── Bars 11–12 · The creator, and the audience behind him. ─────────
    const creator = screen('creator');
    const who = q('.sk-who', creator);
    const whoCentre = centreOf(who, stage);
    irisWipe(tl, wipes, {
      cover: B(CREATOR_BAR),
      x: whoCentre.x,
      y: whoCentre.y,
      width: W,
      height: H,
      colors: ['--cat-research', '--cat-research-2', '--ground'],
    });
    settle(tl, [q('.sk-kicker', creator)], { at: B(CREATOR_BAR), from: 1.15, duration: 900 });
    popIn(tl, [who], { at: B(CREATOR_BAR), base: 0.6, duration: 900 });
    breathe(tl, q('.sk-halo', creator), {
      at: B(CREATOR_BAR),
      duration: B(CTA_BAR) - B(CREATOR_BAR),
      from: 0.9,
      mid: 1.05,
      to: 1.02,
      fadeFrom: 0,
      peak: 1,
      rest: 1,
    });
    rise(tl, splitChars(q('.sk-name', creator)), {
      at: B(CREATOR_BAR, 0.5),
      step: 30,
      distance: 60,
      duration: 800,
    });
    settle(tl, [q('.sk-handle', creator)], { at: B(CREATOR_BAR, 1.25), from: 1.1 });
    const stats = all('.sk-stat', creator);
    rise(tl, stats, { at: B(CREATOR_BAR, 2), step: BEAT, distance: 80, duration: 900 });
    all('.sk-num', creator).forEach((num, i) => {
      countUp(tl, num, {
        to: Number(num.dataset.to),
        at: B(CREATOR_BAR, 2.25 + i),
        duration: i ? 900 : 1500,
      });
    });
    creep(tl, creator, {
      at: B(CREATOR_BAR),
      duration: B(CTA_BAR) - B(CREATOR_BAR),
      to: 1.03,
    });

    // ── Bars 13–15 · Where to run it. A ripple, the mark, the line, then
    //    the real price card from the product page. ──────────────────────
    const cta = screen('cta');
    colorWipe(tl, wipes, {
      cover: B(CTA_BAR),
      from: 'left',
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
        '--cat-sales',
        '--cat-finance',
        '--cat-engineering',
      ],
    });
    popIn(tl, [logo], { at: B(CTA_BAR) - 20, base: 0.25, duration: 800 });
    rise(tl, splitChars(q('.sk-end', cta)), {
      at: B(CTA_BAR, 0.5),
      step: 26,
      distance: 50,
      duration: 800,
    });
    flyIn(tl, q('.sk-price', cta), {
      at: B(CTA_BAR, 1.5),
      y: 420,
      rotate: -4,
      scale: 1.35,
      duration: 1100,
    });
    settle(tl, [q('.url', cta)], { at: B(CTA_BAR + 1, 0.5), from: 1.1, duration: 900 });
    creep(tl, cta, { at: B(CTA_BAR), duration: DURATION - B(CTA_BAR), to: 1.03 });
  },

  /**
   * The soundtrack, cut to the same MAP: music layers carry the energy
   * curve, sfx sit on the exact frames the picture changes.
   */
  score(s) {
    // Its own record, not 010/011's: D minor (i–VI–III–VII), a half-time
    // pocket, a plucked 16th arp and a pluck motif instead of the vocal
    // chops, and no crowd shouts.
    const Dm = [50, 57, 62, 65];
    const Bb = [46, 58, 62, 65];
    const Fj = [53, 57, 60, 64];
    const C = [48, 55, 60, 64];
    const prog = [Dm, Bb, Fj, C];
    /** A two-bar pluck motif on D minor pentatonic: [beat, midi]. */
    const MOTIF: [number, number][] = [
      [0, 74],
      [0.75, 77],
      [1.5, 81],
      [2.5, 79],
      [3, 77],
      [4, 74],
      [4.75, 72],
      [5.5, 74],
      [6.5, 69],
      [7, 72],
    ];
    const motif = (from: number, to: number) => {
      for (let bar = from; bar < to; bar += 2) {
        for (const [beat, note] of MOTIF) {
          const at = B(bar) + beat * BEAT;
          if (at < B(to)) s.add({ kind: 'pluck', at, note, pan: beat % 2 ? 0.25 : -0.25 });
        }
      }
    };
    const lead = (cover: number) => cover - 500; // whoosh peaks on the cover

    // Bars 1–2 · In on the downbeat: half-time drums, the motif, a card
    // landing per eighth; the cards are drawn in on a reversed swell.
    s.impact(B(HOOK_BAR), 0.85).subdrop(B(HOOK_BAR));
    s.halftime(B(HOOK_BAR), B(2, 2)).bassline(B(HOOK_BAR), B(TITLE_BAR), prog);
    s.pads(B(HOOK_BAR), B(TITLE_BAR), prog);
    motif(HOOK_BAR, TITLE_BAR);
    for (let i = 0; i < 5; i += 1) {
      const at = B(HOOK_BAR) + i * CARD_STEP;
      s.whoosh(at - 220, 380, i % 2 ? 'right' : 'left');
      s.hit(at + 140).pop(at + 160, 86 + i * 3);
    }
    s.riser(B(2, 2), B(TITLE_BAR)).whoosh(B(2, 2.5), B(TITLE_BAR) - B(2, 2.5) + 200, 'right');

    // Bars 3–4 · The name blooms on the drop: impact, sparkle, the arp opens.
    s.impact(B(TITLE_BAR), 1.1)
      .subdrop(B(TITLE_BAR))
      .sparkle(B(TITLE_BAR) - 60);
    s.halftime(B(TITLE_BAR), B(RUN_BAR)).bassline(B(TITLE_BAR), B(RUN_BAR), prog);
    s.pads(B(TITLE_BAR), B(RUN_BAR), prog).arp(B(TITLE_BAR), B(RUN_BAR), prog);
    s.pop(B(TITLE_BAR, 1) + 40, 86).pop(B(TITLE_BAR, 2) + 40, 89);
    s.whoosh(lead(B(RUN_BAR)), 900, 'left');

    // Bars 5–8 · Under the run: drums and arp, keys on the typed letters,
    // a click on Run, the riser, and the drop as the ad lands on bar 8.
    s.impact(B(RUN_BAR), 0.7).subdrop(B(RUN_BAR));
    s.halftime(B(RUN_BAR), B(LAND_BAR)).bassline(B(RUN_BAR), B(GALLERY_BAR), prog);
    s.pads(B(RUN_BAR), B(GALLERY_BAR), prog).arp(B(RUN_BAR), B(LAND_BAR), prog);
    for (const field of FIELDS) {
      for (let c = 0; c < field.chars; c += 2) s.key(F(field.at) + c * FOOT_KEY);
    }
    s.tick(F(RUN_CLICK), 96).pop(F(RUN_CLICK) + 20, 93);
    s.riser(F(RUN_CLICK), B(LAND_BAR)).roll(B(7, 2), B(LAND_BAR));
    s.impact(B(LAND_BAR), 1.15)
      .subdrop(B(LAND_BAR))
      .sparkle(B(LAND_BAR) - 80, 'right');
    s.groove(B(LAND_BAR), B(GALLERY_BAR), { claps: true });
    s.stabs(B(LAND_BAR), B(GALLERY_BAR), prog, 0.8);
    motif(LAND_BAR, GALLERY_BAR);
    s.whoosh(lead(B(GALLERY_BAR)), 900, 'right');

    // Bars 9–10 · Full drive: four-on-the-floor, stabs, motif; a pop per tile.
    s.impact(B(GALLERY_BAR), 0.8).subdrop(B(GALLERY_BAR));
    s.groove(B(GALLERY_BAR), B(CREATOR_BAR)).bassline(B(GALLERY_BAR), B(CREATOR_BAR), prog);
    s.stabs(B(GALLERY_BAR), B(CREATOR_BAR), prog, 0.8).pads(
      B(GALLERY_BAR),
      B(CREATOR_BAR),
      prog,
    );
    motif(GALLERY_BAR, CREATOR_BAR);
    for (let i = 0; i < 5; i += 1) s.pop(B(GALLERY_BAR, 0.25) + i * 110 + 40, 86 + i * 3);
    s.whoosh(B(GALLERY_BAR, 1), 1800, 'right');
    s.whoosh(lead(B(CREATOR_BAR)), 900).sparkle(B(CREATOR_BAR) - 120);

    // Bars 11–12 · Breathe back to half-time; a tick per counted step.
    s.impact(B(CREATOR_BAR), 0.7).subdrop(B(CREATOR_BAR));
    s.pads(B(CREATOR_BAR), B(CTA_BAR), prog).arp(B(CREATOR_BAR), B(CTA_BAR), prog, 2);
    s.halftime(B(12), B(CTA_BAR)).bassline(B(12), B(CTA_BAR), prog);
    for (let i = 0; i < 10; i += 1) s.tick(B(CREATOR_BAR, 2.25) + i * 110, 96 + (i % 3) * 2);
    for (let i = 0; i < 6; i += 1) s.tick(B(CREATOR_BAR, 3.25) + i * 110, 100 + (i % 3) * 2);
    s.riser(B(12), B(CTA_BAR)).roll(B(12, 2), B(CTA_BAR));
    s.whoosh(lead(B(CTA_BAR)), 900);

    // Bars 13–15 · Resolve on D: impact, a held Dm(add9), the motif once, ring out.
    s.impact(B(CTA_BAR), 1.15)
      .subdrop(B(CTA_BAR))
      .sparkle(B(CTA_BAR) - 80);
    s.add({
      kind: 'pad',
      at: B(CTA_BAR),
      notes: [50, 57, 62, 64, 65, 69],
      len: DURATION - B(CTA_BAR) - 400,
    });
    s.add({ kind: 'stab', at: B(CTA_BAR), notes: [62, 65, 69, 74], len: 900 });
    motif(CTA_BAR, CTA_BAR + 2);
    s.whoosh(B(CTA_BAR, 1.5) - 250, 600, 'right').hit(B(CTA_BAR, 1.5) + 350);
  },

  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
      el.style.opacity = el.dataset.screen === 'cta' ? '1' : '0';
    });
  },
});
