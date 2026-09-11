import '../../styles/scene-008.css';
import {
  bloom,
  breathe,
  cameraPush,
  countUp,
  drift,
  ease,
  edgePulse,
  emit,
  frame,
  hardCut,
  land,
  motes,
  mountStage,
  popIn,
  press,
  pressBurst,
  reveal,
  Timeline,
  travel3d,
  typeOut,
  typeRich,
  units,
} from '../../lib/index';
import type { Frame, Pose3 } from '../../lib/index';

const DURATION = 48000;

/** Every cut in the brief, in one place. */
const CUT = {
  space: 2_200,
  card2: 8_000,
  primitives: 9_800,
  card3: 13_500,
  lifecycle: 15_000,
  card4: 22_000,
  billing: 23_500,
  card5: 27_000,
  keys: 28_300,
  card6: 31_500,
  ekme: 33_000,
  card7: 41_000,
  closing: 42_500,
  address: 46_000,
} as const;

/**
 * Resting poses for the four panels, in the space camera's own coordinates.
 * These are 3D positions, not a look: z is real depth against .space's
 * 2400px perspective, so the left panel at -150 is genuinely further away
 * than the terminal at +170 and the camera parallaxes across them.
 */
const PANEL: Record<string, Pose3> = {
  market: { x: -644, y: 24, z: -150, ry: 25, rx: -1 },
  terminal: { x: 20, y: -18, z: 175, ry: -3 },
  mcp: { x: 656, y: 34, z: -130, ry: -23, rx: -1 },
  ekme: { x: 300, y: 424, z: -660, ry: 6, rx: -8 },
};

/** Where a panel comes from: behind the camera plane, and invisible. */
function approach(rest: Pose3): Pose3 {
  return { ...rest, x: rest.x! * 0.4, y: (rest.y ?? 0) - 60, z: 940, o: 0 };
}

/** Camera marks for the two passes through the space. */
const RIG = {
  openA: { x: 20, y: 16, z: -170, ry: 4.2, rx: 1.1 },
  openB: { x: -30, y: -20, z: 20, ry: -3.6, rx: -0.6 },
  /* The second pass is a pull back, not a push: z runs away from the panels,
     so the arrangement ends wider and fuller than it ever was on the way in. */
  closeA: { x: 14, y: 22, z: -230, ry: 3.6, rx: 1.2 },
  closeB: { x: -18, y: 4, z: -570, ry: -2.4, rx: -0.5 },
} satisfies Record<string, Pose3>;

/** Framing marks on the docs rig, in its own 1280-wide page pixels. */
const SHOT = {
  docsWide: { x: 750, y: 415, s: 1.36 },
  docsDrift: { x: 764, y: 408, s: 1.44 },
  docsHooks: { x: 1_020, y: 412, s: 2 },
  ekmeWide: { x: 640, y: 380, s: 1.5 },
  ekmeSettle: { x: 640, y: 378, s: 1.51 },
  // 1.53 leaves the credit clear of the edge after the scene-wide 1.032 push crops it.
  ekmePush: { x: 640, y: 400, s: 1.53 },
} satisfies Record<string, Frame>;

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

function all(root: ParentNode, selector: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(selector)];
}

/**
 * Why: the brief asks for a fade up from 0.98, not the house clip. A card
 * that arrives and then stops is a slide, so the settle is followed by a
 * long linear creep that runs until the cut takes it off. Expo dumps the
 * scale early, which is what makes 500ms read as considered rather than slow.
 */
function cardIn(tl: Timeline, card: HTMLElement, at: number, hold: number, punch = 500): void {
  const line = item(card, 'h1');
  tl.add(
    line,
    [
      { transform: 'scale(0.98)', opacity: 0 },
      { transform: 'scale(1.004)', opacity: 1, offset: 0.68 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration: punch, easing: ease.expo, fill: 'forwards' },
  );
  tl.add(line, [{ transform: 'scale(1)' }, { transform: 'scale(1.018)' }], {
    delay: at + punch,
    duration: Math.max(200, hold - punch),
    easing: ease.linear,
    fill: 'forwards',
  });
}

/**
 * Why: a panel is an object arriving in a room, so it brings its own light
 * with it. The bloom flares as the panel lands and then settles to a resting
 * falloff that keeps breathing for the rest of the beat — one flare and a
 * hold, never a glow that switches on.
 */
function panelIn(tl: Timeline, panel: HTMLElement, at: number, hold: number): void {
  const rest = PANEL[panel.dataset.panel ?? ''];
  if (!rest) throw new Error(`No pose for panel ${panel.dataset.panel}`);
  travel3d(tl, panel, { at, duration: 1_150, from: approach(rest), to: rest });
  bloom(tl, item(panel, '.panel-bloom'), { at: at + 620, duration: 900 });
  breathe(tl, item(panel, '.panel-bloom'), {
    at: at + 1_120,
    duration: Math.max(600, hold - 1_120),
    from: 1,
    mid: 1.1,
    to: 1.04,
    peak: 0.5,
    rest: 0.4,
    fadeFrom: 0.5,
    dx: 30,
    dy: -18,
  });
  tl.add(
    item(panel, '.panel-rim'),
    [{ opacity: 0 }, { opacity: 1, offset: 0.42 }, { opacity: 0.78 }],
    { delay: at + 520, duration: 1_100, easing: ease.expo, fill: 'forwards' },
  );
}

/** Why: hold a settled panel in place while the second pass re-frames it. */
function panelHold(tl: Timeline, panel: HTMLElement, at: number): void {
  const rest = PANEL[panel.dataset.panel ?? ''];
  if (!rest) return;
  travel3d(tl, panel, { at, duration: 1, from: rest, to: rest, easing: ease.linear });
}

/**
 * Why: a spot that switches on sits on the control it is meant to lift. This
 * comes up under the thing the camera is already on and is gone before the
 * cut, so nothing hard-edged ever lands on real UI.
 */
function lift(tl: Timeline, el: HTMLElement, at: number, duration: number, peak = 0.86): void {
  tl.add(
    el,
    [
      { transform: 'scale(0.86)', opacity: 0 },
      { transform: 'scale(1)', opacity: peak, offset: 0.34 },
      { transform: 'scale(1.1)', opacity: peak * 0.6, offset: 0.72 },
      { transform: 'scale(1.16)', opacity: 0 },
    ],
    { delay: at, duration, easing: ease.travel, fill: 'forwards' },
  );
}

/** Why: the caret is the only thing in a terminal that is allowed to blink. */
function blink(tl: Timeline, caret: HTMLElement, at: number, until: number): void {
  const period = 900;
  for (let t = at; t < until; t += period) {
    tl.add(
      caret,
      [
        { opacity: 1 },
        { opacity: 1, offset: 0.5 },
        { opacity: 0, offset: 0.52 },
        { opacity: 0 },
      ],
      {
        delay: t,
        duration: Math.min(period, until - t),
        easing: ease.linear,
        fill: 'forwards',
      },
    );
  }
  tl.add(caret, [{ opacity: 0 }, { opacity: 0 }], {
    delay: until,
    duration: 1,
    easing: ease.linear,
    fill: 'forwards',
  });
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, item(stage, '.camera'), { duration: DURATION });

    const card1 = screen(stage, 'card-1');
    const space = screen(stage, 'space');
    const card2 = screen(stage, 'card-2');
    const primitives = screen(stage, 'primitives');
    const card3 = screen(stage, 'card-3');
    const life = screen(stage, 'lifecycle');
    const card4 = screen(stage, 'card-4');
    const billing = screen(stage, 'billing');
    const card5 = screen(stage, 'card-5');
    const keys = screen(stage, 'keys');
    const card6 = screen(stage, 'card-6');
    const ekme = screen(stage, 'ekme');
    const card7 = screen(stage, 'card-7');
    const closing = screen(stage, 'closing');

    // ------------------------------------------------ 0.0 — the claim
    cardIn(tl, card1, 0, CUT.space);

    // ------------------------------------- 2.2 — the three surfaces, 3D
    hardCut(tl, card1, space, CUT.space);
    const rig = item(space, '[data-space-camera]');
    const market = item(space, '[data-panel="market"]');
    const terminal = item(space, '[data-panel="terminal"]');
    const mcp = item(space, '[data-panel="mcp"]');
    const ekmePanel = item(space, '[data-panel="ekme"]');

    // One continuous drift for the whole beat. travel is the long even move
    // that keeps a shot alive; expo would break off the mark and then sit.
    travel3d(tl, rig, {
      at: CUT.space,
      duration: CUT.card2 - CUT.space,
      from: RIG.openA,
      to: RIG.openB,
      easing: ease.travel,
    });
    for (const lamp of all(space, '.lamps > i')) {
      tl.add(lamp, [{ opacity: 0 }, { opacity: 0.78 }], {
        delay: CUT.space,
        duration: 1_400,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
    drift(tl, item(space, '[data-lamp="blue"]'), {
      at: CUT.space,
      duration: CUT.card2 - CUT.space,
      dx: 90,
      dy: 54,
    });
    drift(tl, item(space, '[data-lamp="amber"]'), {
      at: CUT.space,
      duration: CUT.card2 - CUT.space,
      dx: -72,
      dy: -46,
    });
    drift(tl, item(space, '[data-lamp="green"]'), {
      at: CUT.space,
      duration: CUT.card2 - CUT.space,
      dx: -104,
      dy: 40,
    });

    panelIn(tl, market, CUT.space + 120, 4_600);
    panelIn(tl, terminal, CUT.space + 370, 4_400);
    panelIn(tl, mcp, CUT.space + 620, 4_100);

    // Left: the Try it free control on the real listing card, pressed.
    const cursor = item(market, '[data-market-cursor]');
    tl.add(
      cursor,
      [
        { transform: 'translate(26px, 22px) scale(0.9)', opacity: 0 },
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      ],
      { delay: 4_050, duration: 620, easing: ease.expo, fill: 'forwards' },
    );
    press(tl, item(market, '.try-pill'), { at: 4_720 });
    pressBurst(tl, item(market, '[data-market-press]'), { at: 4_760, count: 8, gap: 22 });
    tl.add(cursor, [{ opacity: 1 }, { opacity: 0 }], {
      delay: 5_600,
      duration: 420,
      easing: ease.expo,
      fill: 'forwards',
    });

    // Centre: the curl the docs generate for create-run, typed on.
    const caret = item(terminal, '[data-term-caret]');
    const typedTo = typeRich(tl, item(terminal, '[data-term-cmd]'), { at: 3_150, step: 9 });
    blink(tl, caret, 3_110, typedTo + 520);
    land(tl, item(terminal, '[data-term-out]'), {
      at: typedTo + 300,
      duration: 620,
      from: 1.04,
    });

    // Right: the MCP tool call and its result.
    land(tl, item(mcp, '[data-mcp-call]'), { at: 3_620, duration: 700, from: 1.04 });
    land(tl, item(mcp, '[data-mcp-result]'), { at: 5_240, duration: 700, from: 1.06 });
    emit(tl, item(mcp, '.mcp-result .tick'), {
      at: 5_520,
      count: 6,
      duration: 620,
      radius: 58,
    });

    motes(tl, item(space, '[data-dust="space"]'), {
      at: CUT.space,
      duration: CUT.card2 - CUT.space,
      count: 22,
      seed: 8_101,
      rise: 240,
    });

    // -------------------------------------------------------- 8.0 — card
    hardCut(tl, space, card2, CUT.card2);
    cardIn(tl, card2, CUT.card2, CUT.primitives - CUT.card2);

    // ----------------------------------------- 9.8 — the three primitives
    hardCut(tl, card2, primitives, CUT.primitives);
    const docs = item(primitives, '[data-rig="docs"]');
    frame(tl, docs, {
      at: CUT.primitives,
      duration: 1_500,
      from: SHOT.docsWide,
      to: SHOT.docsDrift,
      easing: ease.linear,
    });
    frame(tl, docs, {
      at: CUT.primitives + 1_500,
      duration: CUT.card3 - CUT.primitives - 1_500,
      from: SHOT.docsDrift,
      to: SHOT.docsHooks,
      easing: ease.travel,
    });

    // Icon first, then the card body settles behind it — the order the eye
    // reads a concept card in, rather than the whole tile arriving at once.
    const concepts = all(primitives, '[data-concept]');
    concepts.forEach((card, i) => {
      const at = CUT.primitives + 140 + i * 250;
      land(tl, item(card, '[data-concept-icon]'), { at, duration: 620, from: 0.6 });
      tl.add(
        card,
        [
          { transform: 'translate3d(0, 16px, 0)', opacity: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ],
        { delay: at + 120, duration: 780, easing: ease.expo, fill: 'forwards' },
      );
    });
    popIn(tl, all(primitives, '[data-endpoint]'), {
      at: CUT.primitives + 1_020,
      step: 88,
      duration: 640,
      base: 0.97,
    });
    lift(tl, item(primitives, '[data-spot="webhooks"]'), CUT.primitives + 1_620, 2_180, 0.92);
    emit(tl, item(primitives, '[data-spark="webhooks"]'), {
      at: CUT.primitives + 1_820,
      count: 8,
      duration: 640,
      radius: 84,
    });
    motes(tl, item(primitives, '[data-dust="primitives"]'), {
      at: CUT.primitives,
      duration: CUT.card3 - CUT.primitives,
      count: 16,
      seed: 3_307,
      rise: 190,
    });

    // ------------------------------------------------------- 13.5 — card
    hardCut(tl, primitives, card3, CUT.card3);
    cardIn(tl, card3, CUT.card3, CUT.lifecycle - CUT.card3);

    // ------------------------------------------- 15.0 — the run lifecycle
    // Seven seconds, no cuts. The object is introduced first and every stage
    // after it changes the object rather than replacing it.
    hardCut(tl, card3, life, CUT.lifecycle);
    const runObject = item(life, '[data-run-object]');
    const runBody = item(life, '[data-run-body]');

    tl.add(
      runObject,
      [
        { transform: 'scale(0.46)', opacity: 0 },
        { transform: 'scale(0.72)', opacity: 1 },
      ],
      { delay: CUT.lifecycle + 120, duration: 900, easing: ease.expo, fill: 'forwards' },
    );
    // One slow turn across the whole beat, so the faces catch light at
    // different angles and the box never reads as a flat hexagon.
    travel3d(tl, runBody, {
      at: CUT.lifecycle,
      duration: CUT.card4 - CUT.lifecycle,
      from: { rx: -24, ry: -34 },
      to: { rx: -14, ry: 232 },
      easing: ease.linear,
    });

    // 1 — the request. Line by line, out of the house mask.
    land(tl, item(life, '[data-life="request"]'), {
      at: CUT.lifecycle + 60,
      duration: 760,
      from: 1.03,
    });
    reveal(tl, units(item(life, '[data-life="request"]')), {
      at: CUT.lifecycle + 260,
      step: 62,
      duration: 780,
    });

    // 2 — 202 Accepted, and the object takes the charge.
    const accepted = item(life, '[data-life="accepted"]');
    land(tl, accepted, { at: 16_620, duration: 760, from: 1.03 });
    reveal(tl, units(accepted), { at: 16_820, step: 58, duration: 760 });
    land(tl, item(accepted, '[data-status-202]'), { at: 16_720, duration: 620, from: 1.18 });
    lift(tl, item(accepted, '[data-status-glow]'), 16_720, 1_500, 0.95);
    tl.add(
      item(life, '[data-run-core]'),
      [
        { transform: 'scale(0.3)', opacity: 0 },
        { transform: 'scale(1.06)', opacity: 0.95, offset: 0.7 },
        { transform: 'scale(1)', opacity: 0.85 },
      ],
      { delay: 16_760, duration: 900, easing: ease.expo, fill: 'forwards' },
    );
    tl.add(runObject, [{ transform: 'scale(0.62)' }, { transform: 'scale(0.78)' }], {
      delay: 16_760,
      duration: 900,
      easing: ease.expo,
      fill: 'forwards',
    });
    tl.add(
      item(life, '[data-run-halo]'),
      [
        { transform: 'scale(0.72)', opacity: 0 },
        { transform: 'scale(1)', opacity: 0.55 },
      ],
      { delay: 16_800, duration: 1_100, easing: ease.expo, fill: 'forwards' },
    );

    // 3 — the events. Deliberately uneven: a real run does not tick.
    const events = item(life, '[data-life="events"]');
    land(tl, events, { at: 18_180, duration: 720, from: 1.03 });
    const eventAt = [18_420, 18_940, 19_760, 20_480];
    all(events, '[data-event]').forEach((row, i) => {
      const at = eventAt[i] ?? 18_400 + i * 500;
      tl.add(
        row,
        [
          { transform: 'translate3d(-18px, 0, 0)', opacity: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ],
        { delay: at, duration: 620, easing: ease.expo, fill: 'forwards' },
      );
      // Each event is the object gaining a little more internal structure.
      const lattice = all(life, '[data-run-lattice]')[i];
      if (lattice) {
        tl.add(lattice, [{ opacity: 0 }, { opacity: 0.72 }], {
          delay: at + 60,
          duration: 520,
          easing: ease.expo,
          fill: 'forwards',
        });
      }
      tl.add(
        item(life, '[data-run-halo]'),
        [{ opacity: 0.55 + i * 0.05 }, { opacity: 0.6 + i * 0.05 }],
        { delay: at, duration: 420, easing: ease.expo, fill: 'forwards' },
      );
    });
    all(life, '[data-run-ring]').forEach((ring, i) => {
      tl.add(ring, [{ opacity: 0 }, { opacity: 0.5 }], {
        delay: 19_100 + i * 220,
        duration: 700,
        easing: ease.expo,
        fill: 'forwards',
      });
    });

    // 4 — the object resolves and the output is what is left.
    tl.add(
      runObject,
      [
        { transform: 'scale(0.9)' },
        { transform: 'scale(1.12)', offset: 0.55 },
        { transform: 'scale(1.04)' },
      ],
      { delay: 20_700, duration: 900, easing: ease.expo, fill: 'forwards' },
    );
    emit(tl, item(life, '[data-spark="resolve"]'), {
      at: 20_780,
      count: 10,
      duration: 820,
      radius: 210,
    });
    land(tl, item(life, '[data-life="output"]'), { at: 20_940, duration: 820, from: 1.05 });
    popIn(tl, all(life, '[data-out-meta]'), {
      at: 21_320,
      step: 95,
      duration: 600,
      base: 0.94,
    });
    motes(tl, item(life, '[data-dust="life"]'), {
      at: CUT.lifecycle,
      duration: CUT.card4 - CUT.lifecycle,
      count: 20,
      seed: 5_501,
      rise: 220,
    });

    // ------------------------------------------------------- 22.0 — card
    hardCut(tl, life, card4, CUT.card4);
    cardIn(tl, card4, CUT.card4, CUT.billing - CUT.card4);

    // ------------------------------------------- 23.5 — billing parity
    hardCut(tl, card4, billing, CUT.billing);
    land(tl, item(billing, '.runtime-card'), {
      at: CUT.billing + 140,
      duration: 860,
      from: 1.04,
    });
    land(tl, item(billing, '.api-card'), { at: CUT.billing + 260, duration: 860, from: 1.04 });

    // The one deliberate simultaneity in the film. Everything around these
    // two numbers staggers; the numbers themselves resolve on the same frame
    // and glow on the same frame, because the beat is that they are equal.
    const PARITY = 25_100;
    countUp(tl, item(billing, '[data-price-product]'), {
      to: 2.5,
      at: PARITY,
      duration: 1_000,
      decimals: 2,
      prefix: '$',
    });
    countUp(tl, item(billing, '[data-price-api]'), {
      to: 2.5,
      at: PARITY,
      duration: 1_000,
      decimals: 1,
    });
    for (const glow of all(billing, '[data-chip-glow]')) {
      lift(tl, glow, PARITY + 780, 1_500, 0.8);
    }
    motes(tl, item(billing, '[data-dust="billing"]'), {
      at: CUT.billing,
      duration: CUT.card5 - CUT.billing,
      count: 14,
      seed: 6_101,
      rise: 180,
    });

    // ------------------------------------------------------- 27.0 — card
    hardCut(tl, billing, card5, CUT.card5);
    cardIn(tl, card5, CUT.card5, CUT.keys - CUT.card5, 420);

    // ------------------------------------------------- 28.3 — key scoping
    hardCut(tl, card5, keys, CUT.keys);
    tl.add(item(keys, '.console'), [{ opacity: 0 }, { opacity: 0.5 }], {
      delay: CUT.keys,
      duration: 520,
      easing: ease.expo,
      fill: 'forwards',
    });
    tl.add(item(keys, '.shade'), [{ opacity: 0 }, { opacity: 1 }], {
      delay: CUT.keys + 120,
      duration: 520,
      easing: ease.expo,
      fill: 'forwards',
    });
    land(tl, item(keys, '[data-key-modal]'), {
      at: CUT.keys + 180,
      duration: 820,
      from: 1.035,
    });
    popIn(tl, all(keys, '[data-check]'), {
      at: CUT.keys + 560,
      step: 90,
      duration: 560,
      base: 0.98,
    });
    // The switch is the real 38x22 control: the track colour is a class swap
    // because a colour cannot animate on the compositor, and only the knob
    // travels — 16px on the real control, at the scale this one is drawn.
    tl.at(CUT.keys + 1_100, () => {
      item(keys, '[data-cap-toggle]').classList.add('on');
    });
    tl.add(
      item(keys, '[data-cap-knob]'),
      [{ transform: 'translateX(0)' }, { transform: 'translateX(28px)' }],
      { delay: CUT.keys + 1_100, duration: 320, easing: ease.expo, fill: 'forwards' },
    );
    land(tl, item(keys, '[data-cap-fields]'), {
      at: CUT.keys + 1_220,
      duration: 640,
      from: 0.99,
    });
    // The value settles first. Only once the number has stopped moving does
    // the boundary answer it — a trust beat reads as restraint, not as a hit.
    countUp(tl, item(keys, '[data-cap-value]'), {
      to: 25,
      at: CUT.keys + 1_320,
      duration: 820,
    });
    edgePulse(tl, item(keys, '[data-cap-edge]'), {
      at: CUT.keys + 2_280,
      count: 3,
      gap: 95,
      duration: 880,
    });
    motes(tl, item(keys, '[data-dust="keys"]'), {
      at: CUT.keys,
      duration: CUT.card6 - CUT.keys,
      count: 12,
      seed: 7_703,
      rise: 160,
    });

    // ------------------------------------------------------- 31.5 — card
    hardCut(tl, keys, card6, CUT.card6);
    cardIn(tl, card6, CUT.card6, CUT.ekme - CUT.card6);

    // ------------------------------------------------------- 33.0 — Ekme
    // Hard cut into light. Eight seconds, one long settle, and the Edgaze
    // credit is the smallest type in the film.
    hardCut(tl, card6, ekme, CUT.ekme);
    const ekmeRig = item(ekme, '[data-rig="ekme"]');
    frame(tl, ekmeRig, {
      at: CUT.ekme,
      duration: 1_100,
      from: SHOT.ekmeWide,
      to: SHOT.ekmeSettle,
      easing: ease.travel,
    });
    frame(tl, ekmeRig, {
      at: CUT.ekme + 1_100,
      duration: CUT.card7 - CUT.ekme - 1_100,
      from: SHOT.ekmeSettle,
      to: SHOT.ekmePush,
      easing: ease.travel,
    });

    const ekmeCaret = item(ekme, '[data-ekme-caret]');
    typeOut(tl, item(ekme, '[data-ekme-url]'), {
      at: CUT.ekme + 500,
      text: 'https://example.com',
      step: 46,
    });
    blink(tl, ekmeCaret, CUT.ekme + 440, CUT.ekme + 1_760);
    tl.add(
      item(ekme, '[data-ekme-credit]'),
      [
        { transform: 'translate3d(0, 6px, 0)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      { delay: CUT.ekme + 1_500, duration: 700, easing: ease.expo, fill: 'forwards' },
    );

    press(tl, item(ekme, '[data-ekme-go]'), { at: CUT.ekme + 1_820 });
    pressBurst(tl, item(ekme, '[data-ekme-press]'), {
      at: CUT.ekme + 1_860,
      count: 8,
      gap: 22,
    });

    // Ekme's own progress language: a thin sage bar, no Edgaze anywhere.
    land(tl, item(ekme, '[data-ekme-progress]'), {
      at: CUT.ekme + 2_020,
      duration: 520,
      from: 0.99,
    });
    tl.add(
      item(ekme, '[data-ekme-bar]'),
      [
        { transform: 'scaleX(0.04)' },
        { transform: 'scaleX(0.52)', offset: 0.44 },
        { transform: 'scaleX(1)' },
      ],
      { delay: CUT.ekme + 2_080, duration: 2_600, easing: ease.travel, fill: 'forwards' },
    );
    const steps: Array<[number, string]> = [
      [CUT.ekme + 2_080, 'Reading the page'],
      [CUT.ekme + 3_000, 'Separating source from inference'],
      [CUT.ekme + 3_940, 'Writing the brief'],
    ];
    for (const [at, text] of steps) {
      tl.at(at, () => {
        item(ekme, '[data-ekme-step]').textContent = text;
      });
    }
    tl.add(item(ekme, '[data-ekme-progress]'), [{ opacity: 1 }, { opacity: 0 }], {
      delay: CUT.ekme + 4_820,
      duration: 420,
      easing: ease.expo,
      fill: 'forwards',
    });

    land(tl, item(ekme, '[data-ekme-brief]'), {
      at: CUT.ekme + 3_060,
      duration: 820,
      from: 0.985,
    });
    all(ekme, '[data-brief-part]').forEach((part, i) => {
      tl.add(
        part,
        [
          { transform: 'translate3d(0, 12px, 0)', opacity: 0 },
          { transform: 'translate3d(0, 0, 0)', opacity: 1 },
        ],
        {
          delay: CUT.ekme + 3_340 + i * 340,
          duration: 720,
          easing: ease.expo,
          fill: 'forwards',
        },
      );
    });
    land(tl, item(ekme, '[data-brief-state]'), {
      at: CUT.ekme + 5_200,
      duration: 620,
      from: 1.14,
    });

    // ------------------------------------------------------- 41.0 — card
    hardCut(tl, ekme, card7, CUT.card7);
    cardIn(tl, card7, CUT.card7, CUT.closing - CUT.card7);

    // ------------------------------- 42.5 — back into the space, wider
    // Same geometry, same lights, pulled further back, and Ekme is in the
    // depth now. The three panels finish inside 400ms of each other.
    hardCut(tl, card7, space, CUT.closing);
    for (const panel of [market, terminal, mcp]) panelHold(tl, panel, CUT.closing);
    travel3d(tl, rig, {
      at: CUT.closing,
      duration: CUT.address - CUT.closing,
      from: RIG.closeA,
      to: RIG.closeB,
      easing: ease.travel,
    });
    for (const lamp of all(space, '.lamps > i')) {
      tl.add(lamp, [{ opacity: 0.78 }, { opacity: 1 }], {
        delay: CUT.closing,
        duration: 1_100,
        easing: ease.expo,
        fill: 'forwards',
      });
    }
    for (const bloomEl of all(space, '.panel-bloom')) {
      breathe(tl, bloomEl, {
        at: CUT.closing,
        duration: CUT.address - CUT.closing,
        from: 1,
        mid: 1.14,
        to: 1.08,
        peak: 0.76,
        rest: 0.66,
        fadeFrom: 0.4,
        dx: 24,
        dy: -14,
      });
    }
    panelIn(tl, ekmePanel, CUT.closing + 260, 2_800);

    const finish: Array<[HTMLElement, number]> = [
      [item(market, '.try-pill'), CUT.closing + 1_180],
      [item(terminal, '[data-term-out]'), CUT.closing + 1_320],
      [item(mcp, '[data-mcp-result]'), CUT.closing + 1_460],
    ];
    for (const [el, at] of finish) {
      tl.add(
        el,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.05)', opacity: 1, offset: 0.45 },
          { transform: 'scale(1)', opacity: 1 },
        ],
        { delay: at, duration: 700, easing: ease.expo, fill: 'forwards' },
      );
    }
    motes(tl, item(space, '[data-dust="space"]'), {
      at: CUT.closing,
      duration: CUT.address - CUT.closing,
      count: 26,
      seed: 9_209,
      rise: 300,
    });

    // ------------------------------------------------------ 46.0 — address
    hardCut(tl, space, closing, CUT.address);
    const line = item(closing, 'h1');
    tl.add(
      line,
      [
        { transform: 'scale(0.98)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: CUT.address + 180, duration: 600, easing: ease.travel, fill: 'forwards' },
    );
    tl.add(line, [{ transform: 'scale(1)' }, { transform: 'scale(1.016)' }], {
      delay: CUT.address + 780,
      duration: DURATION - CUT.address - 780,
      easing: ease.linear,
      fill: 'forwards',
    });
  },

  still(stage) {
    for (const el of stage.querySelectorAll<HTMLElement>('.screen')) {
      el.style.opacity = el.dataset.screen === 'closing' ? '1' : '0';
    }
    const line = item(stage, '[data-screen="closing"] h1');
    line.style.opacity = '1';
    line.style.transform = 'scale(1)';
    item(stage, '.camera').style.transform = 'scale(1.032)';
  },
});
