import {
  aura,
  bloom,
  cameraPush,
  conceal,
  ease,
  emit,
  hardCut,
  land,
  mountStage,
  popIn,
  resolveHint,
  reveal,
  suspendMarks,
  sweepAcross,
  Timeline,
  track,
  units,
} from '../../lib/index';

const DURATION = 25000;
const SNAP = 280;

function cardIn(tl: Timeline, screen: HTMLElement, at: number): void {
  const line = screen.querySelector<HTMLElement>('.line');
  if (line) land(tl, line, { at, duration: 780, from: 1.12 });
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });

    const card1 = stage.querySelector<HTMLElement>('[data-screen="card-1"]')!;
    const field = stage.querySelector<HTMLElement>('[data-screen="field"]')!;
    const card2 = stage.querySelector<HTMLElement>('[data-screen="card-2"]')!;
    const assign = stage.querySelector<HTMLElement>('[data-screen="assign"]')!;
    const card3 = stage.querySelector<HTMLElement>('[data-screen="card-3"]')!;
    const migrate = stage.querySelector<HTMLElement>('[data-screen="migrate"]')!;
    const card4 = stage.querySelector<HTMLElement>('[data-screen="card-4"]')!;

    cardIn(tl, card1, 0);
    hardCut(tl, card1, field, 3000);

    const marks = [...field.querySelectorAll<HTMLElement>('.mark')];
    suspendMarks(tl, marks, {
      at: 3040,
      duration: 3400,
      settleAt: 6680,
      settleStep: 88,
      start: [
        { x: -520, y: -260, scale: 1.72, opacity: 0.95 },
        { x: 280, y: 310, scale: 0.38, opacity: 0.34 },
        { x: 510, y: -340, scale: 1.46, opacity: 0.78 },
        { x: -460, y: 290, scale: 0.32, opacity: 0.24 },
        { x: 580, y: 180, scale: 0.62, opacity: 0.44 },
      ],
      wander: [
        { x: 180, y: 220, scale: 1.1, opacity: 0.88 },
        { x: -340, y: -180, scale: 0.86, opacity: 0.52 },
        { x: -200, y: 80, scale: 0.7, opacity: 0.7 },
        { x: 400, y: -220, scale: 0.78, opacity: 0.4 },
        { x: -80, y: 300, scale: 1.2, opacity: 0.68 },
      ],
      drift: [
        { x: 240, y: -190, scale: 1.24, opacity: 0.9 },
        { x: -280, y: 140, scale: 0.64, opacity: 0.5 },
        { x: 80, y: 260, scale: 1.02, opacity: 0.8 },
        { x: 320, y: 40, scale: 0.48, opacity: 0.42 },
        { x: -360, y: -160, scale: 0.82, opacity: 0.6 },
      ],
      settle: [
        { x: 0, y: 0, scale: 1, opacity: 0.92 },
        { x: 0, y: 0, scale: 1, opacity: 0.9 },
        { x: 0, y: 0, scale: 1, opacity: 0.92 },
        { x: 0, y: 0, scale: 1, opacity: 0.88 },
        { x: 0, y: 0, scale: 1, opacity: 0.9 },
      ],
    });
    sweepAcross(tl, field.querySelector<HTMLElement>('.field')!, { at: 6400, duration: 1200 });
    marks.forEach((mark, i) => {
      const sparks = mark.querySelector<HTMLElement>('.mark-burst');
      if (sparks) emit(tl, sparks, { at: 6680 + i * 88, count: 5, duration: 640, radius: 86 });
    });

    hardCut(tl, field, card2, 9000);
    cardIn(tl, card2, 9000);
    hardCut(tl, card2, assign, 11000);

    const nodes = [...stage.querySelectorAll<HTMLElement>('[data-screen="assign"] .wf-node')];
    const edges = [...stage.querySelectorAll<HTMLElement>('.wire')];
    popIn(tl, nodes, { at: 11080, step: 220, duration: SNAP, base: 0.86 });
    nodes.forEach((node, i) => {
      const brand = node.querySelector<HTMLElement>('.brand');
      const hint = node.querySelector<HTMLElement>('.hint');
      resolveHint(
        tl,
        [brand, hint].filter((el): el is HTMLElement => Boolean(el)),
        { at: 11080 + i * 220 + 120 },
      );
    });
    popIn(tl, edges, { at: 11300, step: 220, duration: 180, base: 1 });

    const rig = assign.querySelector<HTMLElement>('.canvas')!;
    const zoom = 3.5;
    const x = [495, 165, -165, -495] as const;
    track(tl, rig, { at: 11080, duration: 240, fromX: 0, toX: x[0], from: 1, to: zoom });
    track(tl, rig, { at: 11680, duration: 260, fromX: x[0], toX: x[1], from: zoom, to: zoom });
    track(tl, rig, { at: 12500, duration: 260, fromX: x[1], toX: x[2], from: zoom, to: zoom });
    track(tl, rig, { at: 13320, duration: 260, fromX: x[2], toX: x[3], from: zoom, to: zoom });

    const auras = [...assign.querySelectorAll<HTMLElement>('.aura')];
    const visits = [
      { at: 11080, duration: 3040 },
      { at: 11680, duration: 2440 },
      { at: 12500, duration: 1620 },
      { at: 13320, duration: 800 },
    ];
    visits.forEach((visit, i) => {
      const el = auras[i];
      if (el) aura(tl, el, visit);
    });

    hardCut(tl, assign, card3, 14120);
    cardIn(tl, card3, 14120);
    hardCut(tl, card3, migrate, 16020);

    const migrateRig = migrate.querySelector<HTMLElement>('.canvas')!;
    const solo = migrate.querySelector<HTMLElement>('[data-solo]')!;
    const soloName = solo.querySelector<HTMLElement>('.wf-name')!;
    const was = migrate.querySelector<HTMLElement>('[data-was]')!;
    const now = migrate.querySelector<HTMLElement>('[data-now]')!;
    const flare = migrate.querySelector<HTMLElement>('.flare')!;
    const burst = migrate.querySelector<HTMLElement>('.burst')!;

    popIn(tl, [solo], { at: 16100, duration: 320, step: 0, base: 0.88 });
    track(tl, migrateRig, {
      at: 16180,
      duration: 420,
      fromX: 0,
      toX: 0,
      from: 1,
      to: 2.05,
    });
    track(tl, migrateRig, {
      at: 17100,
      duration: 400,
      fromX: 0,
      toX: 0,
      fromY: 0,
      toY: -88,
      from: 2.05,
      to: 5.2,
    });
    tl.add(
      soloName,
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(14px)', opacity: 0 },
      ],
      { delay: 17100, duration: 280, easing: ease.expo, fill: 'forwards' },
    );
    conceal(tl, units(was), { at: 17220, duration: 280, step: 0 });
    bloom(tl, flare, { at: 17280, duration: 720 });
    emit(tl, burst, { at: 17340, count: 8, duration: 680, radius: 78 });
    reveal(tl, units(now), { at: 17400, duration: 420, step: 0 });
    track(tl, migrateRig, {
      at: 18460,
      duration: 520,
      fromX: 0,
      toX: 0,
      fromY: -88,
      toY: 0,
      from: 5.2,
      to: 2.12,
    });
    tl.add(
      soloName,
      [
        { transform: 'translateY(14px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { delay: 18520, duration: 380, easing: ease.expo, fill: 'forwards' },
    );

    hardCut(tl, migrate, card4, 20020);
    land(tl, card4.querySelector<HTMLElement>('.lockup')!, {
      at: 20020,
      duration: 520,
      from: 1.16,
    });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
      el.style.opacity = '0';
    });
    const end = stage.querySelector<HTMLElement>('[data-screen="card-4"]');
    if (end) end.style.opacity = '1';
    stage.querySelectorAll<HTMLElement>('.line, .lockup').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
  },
});
