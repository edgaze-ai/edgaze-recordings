import '../../styles/scene-006.css';
import {
  cameraPush,
  clipSwap,
  ease,
  hardCut,
  land,
  mountStage,
  type Pose3,
  Timeline,
  travel3d,
} from '../../lib/index';

const DURATION = 16000;

const CUT = {
  panel: 700,
  card2: 3800,
  live: 4500,
  card3: 9600,
  surfaces: 10300,
  card4: 13800,
} as const;

const PLATE = 2.6;

function plate(pose: Pose3): Pose3 {
  return { ...pose, s: (pose.s ?? 1) / PLATE };
}

const ROW_NAME = plate({ x: 40, y: 220, s: 1.22 });
const STATUS_RUN = plate({ x: -203, y: 316, s: 1.4 });
const LIST_SURFACES = plate({ x: 298, y: 59, s: 1.28 });
const SRC_BUILDER = plate({ x: 638, y: 433, s: 2.55 });
const SRC_MARKET = plate({ x: 638, y: 197, s: 2.55 });
const SRC_DEMO = plate({ x: 638, y: -39, s: 2.55 });
const SRC_API = plate({ x: 638, y: -274, s: 2.55 });
const SRC_MCP = plate({ x: 638, y: -510, s: 2.55 });
const LIST_HERO = plate({ x: 232, y: -40, s: 1.24 });
const LIVE_WIDE = plate({ x: 0, y: 0, s: 1 });

const LINK_TRAVEL = 220 * PLATE;
const LINK_CYCLE = 2100;
const DOT_CYCLE = 900;

function cardIn(tl: Timeline, screen: HTMLElement, at: number): void {
  const line = screen.querySelector<HTMLElement>('.line');
  if (line) land(tl, line, { at, duration: 240, from: 1.16 });
}

function rest(
  tl: Timeline,
  el: HTMLElement | null,
  { at, duration = 160, from, to }: { at: number; duration?: number; from: number; to: number },
): void {
  if (!el) return;
  tl.add(
    el,
    [
      { opacity: from, transform: 'scale(1)' },
      { opacity: to, transform: 'scale(1)' },
    ],
    {
      delay: at,
      duration,
      easing: ease.expo,
      fill: 'forwards',
    },
  );
}

function glide(
  tl: Timeline,
  el: HTMLElement,
  { at, duration, from, to }: { at: number; duration: number; from: Pose3; to: Pose3 },
): void {
  tl.add(
    el,
    [
      {
        transform: `translate3d(${from.x ?? 0}px, ${from.y ?? 0}px, ${from.z ?? 0}px) rotateX(${from.rx ?? 0}deg) rotateY(${from.ry ?? 0}deg) scale(${from.s ?? 1})`,
        opacity: 1,
      },
      {
        transform: `translate3d(${to.x ?? 0}px, ${to.y ?? 0}px, ${to.z ?? 0}px) rotateX(${to.rx ?? 0}deg) rotateY(${to.ry ?? 0}deg) scale(${to.s ?? 1})`,
        opacity: 1,
      },
    ],
    { delay: at, duration, easing: ease.travel, fill: 'forwards' },
  );
}

function sheen(tl: Timeline, el: HTMLElement | null, at: number, duration: number): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'translateX(-36%)', opacity: 0 },
      { transform: 'translateX(0%)', opacity: 0.2, offset: 0.46 },
      { transform: 'translateX(40%)', opacity: 0 },
    ],
    { delay: at, duration, easing: ease.travel, fill: 'forwards' },
  );
}

function pulseSrc(tl: Timeline, el: HTMLElement, at: number): void {
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 0.82 },
      { transform: 'scale(1.04)', opacity: 1, offset: 0.5 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration: 420, easing: ease.expo, fill: 'forwards' },
  );
}

function pulseStatus(tl: Timeline, el: HTMLElement, at: number, duration: number): void {
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 0.78 },
      { transform: 'scale(1.16)', opacity: 1, offset: 0.44 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

function loopPacket(
  tl: Timeline,
  el: HTMLElement | null,
  { at, wait = 0, cycles = 3 }: { at: number; wait?: number; cycles?: number },
): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'translate3d(0px, -50%, 0) scale(0.6)', opacity: 0 },
      {
        transform: `translate3d(${LINK_TRAVEL * 0.12}px, -50%, 0) scale(1)`,
        opacity: 1,
        offset: 0.12,
      },
      {
        transform: `translate3d(${LINK_TRAVEL * 0.88}px, -50%, 0) scale(1)`,
        opacity: 1,
        offset: 0.88,
      },
      { transform: `translate3d(${LINK_TRAVEL}px, -50%, 0) scale(0.6)`, opacity: 0 },
    ],
    {
      delay: at + wait,
      duration: LINK_CYCLE,
      iterations: cycles,
      easing: ease.travel,
      fill: 'both',
    },
  );
}

function loopSweep(tl: Timeline, el: HTMLElement | null, at: number, cycles = 3): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'translate3d(-120%, -50%, 0)', opacity: 0.7 },
      { transform: 'translate3d(320%, -50%, 0)', opacity: 0.7 },
    ],
    {
      delay: at,
      duration: LINK_CYCLE,
      iterations: cycles,
      easing: ease.travel,
      fill: 'both',
    },
  );
}

function loopRing(
  tl: Timeline,
  el: HTMLElement | null,
  { at, wait = 0, cycles = 3 }: { at: number; wait?: number; cycles?: number },
): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 0.55 },
      { transform: 'scale(1.45)', opacity: 0, offset: 0.7 },
      { transform: 'scale(1.45)', opacity: 0 },
    ],
    {
      delay: at + wait,
      duration: LINK_CYCLE,
      iterations: cycles,
      easing: ease.expo,
      fill: 'both',
    },
  );
}

function loopDot(
  tl: Timeline,
  el: HTMLElement,
  { at, wait = 0, cycles = 5 }: { at: number; wait?: number; cycles?: number },
): void {
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 0.15 },
      { transform: 'scale(1)', opacity: 1, offset: 0.4 },
      { transform: 'scale(1)', opacity: 0.15 },
    ],
    {
      delay: at + wait,
      duration: DOT_CYCLE,
      iterations: cycles,
      easing: ease.expo,
      fill: 'both',
    },
  );
}

function focusRow(tl: Timeline, rows: HTMLElement[], index: number, at: number): void {
  tl.at(at, () => {
    rows.forEach((row, i) => row.classList.toggle('is-focus', i === index));
  });
}

function heatOne(tl: Timeline, items: HTMLElement[], el: HTMLElement | null, at: number): void {
  tl.at(at, () => {
    items.forEach((item) => item.classList.toggle('is-hot', item === el));
  });
}

function heatAll(tl: Timeline, items: HTMLElement[], at: number): void {
  tl.at(at, () => {
    items.forEach((item) => item.classList.add('is-hot'));
  });
}

const RISE = 16;

function rise(tl: Timeline, el: HTMLElement | null, at: number): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: `translateY(${RISE}px)`, opacity: 0 },
      { transform: 'translateY(0px)', opacity: 1 },
    ],
    { delay: at, duration: 320, easing: ease.expo, fill: 'forwards' },
  );
}

function showSolo(
  tl: Timeline,
  solos: HTMLElement[],
  index: number,
  at: number,
  first = false,
): void {
  tl.at(at, () => {
    solos.forEach((el, i) => el.classList.toggle('is-on', i === index));
  });
  if (!first) {
    solos.forEach((el, i) => {
      if (i !== index) rest(tl, el, { at, duration: 160, from: 1, to: 0 });
    });
  }
  rise(tl, solos[index] ?? null, first ? at : at + 60);
}

function loopSheen(tl: Timeline, el: HTMLElement | null, at: number, cycles = 2): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'translateX(-130%)', opacity: 0.9 },
      { transform: 'translateX(130%)', opacity: 0.9 },
    ],
    {
      delay: at,
      duration: 2400,
      iterations: cycles,
      easing: ease.travel,
      fill: 'both',
    },
  );
}

function markDots(
  tl: Timeline,
  dots: HTMLElement[],
  done: number,
  on: number,
  at: number,
): void {
  tl.at(at, () => {
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-done', i < done);
      dot.classList.toggle('is-on', i === on);
    });
  });
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });

    const card1 = stage.querySelector<HTMLElement>('[data-screen="card-1"]')!;
    const card2 = stage.querySelector<HTMLElement>('[data-screen="card-2"]')!;
    const card3 = stage.querySelector<HTMLElement>('[data-screen="card-3"]')!;
    const card4 = stage.querySelector<HTMLElement>('[data-screen="card-4"]')!;
    const runs = stage.querySelector<HTMLElement>('[data-screen="runs"]')!;
    const rig = runs.querySelector<HTMLElement>('[data-rig]')!;
    const list = runs.querySelector<HTMLElement>('[data-panel="list"]')!;
    const run = runs.querySelector<HTMLElement>('[data-panel="run"]')!;
    const rows = [...list.querySelectorAll<HTMLElement>('.row')];
    const hero = rows[0]!;
    const status = hero.querySelector<HTMLElement>('[data-status]')!;
    const sources = [
      list.querySelector<HTMLElement>('[data-row="0"] [data-source="builder"]')!,
      list.querySelector<HTMLElement>('[data-row="1"] [data-source="marketplace"]')!,
      list.querySelector<HTMLElement>('[data-row="2"] [data-source="demo"]')!,
      list.querySelector<HTMLElement>('[data-row="3"] [data-source="api"]')!,
      list.querySelector<HTMLElement>('[data-row="4"] [data-source="mcp"]')!,
    ];
    const sheenList = list.querySelector<HTMLElement>('[data-sheen="list"]');
    const sheenRun = run.querySelector<HTMLElement>('[data-sheen="run"]');
    const liveView = run.querySelector<HTMLElement>('[data-live-view]')!;
    const settledView = run.querySelector<HTMLElement>('[data-settled-view]')!;
    const liveStatus = run.querySelector<HTMLElement>('[data-live-status]')!;
    const activity = run.querySelector<HTMLElement>('[data-activity]')!;
    const elapsed = run.querySelector<HTMLElement>('[data-elapsed]')!;
    const count = run.querySelector<HTMLElement>('[data-count]')!;
    const dots = [...run.querySelectorAll<HTMLElement>('[data-dots] b')];
    const packets = [...run.querySelectorAll<HTMLElement>('[data-pkt]')];
    const sweep = run.querySelector<HTMLElement>('[data-sweep]');
    const rings = [...run.querySelectorAll<HTMLElement>('.ring')];
    const tickDots = [...run.querySelectorAll<HTMLElement>('.dots i')];
    const link = run.querySelector<HTMLElement>('[data-link]')!;
    const nodeStage = run.querySelector<HTMLElement>('[data-nodes]')!;
    const solos = [...nodeStage.querySelectorAll<HTMLElement>('.solo')];
    const nodeSheen = nodeStage.querySelector<HTMLElement>('[data-node-sheen]');
    const railOn = run.querySelector<HTMLElement>('.rail-item.is-on')!;
    const railMeta = railOn.querySelector<HTMLElement>('.rail-meta')!;

    travel3d(tl, rig, { at: 0, duration: 1, from: ROW_NAME, to: ROW_NAME });
    rest(tl, run, { at: 0, duration: 1, from: 0, to: 0 });

    cardIn(tl, card1, 0);
    hardCut(tl, card1, runs, CUT.panel);

    travel3d(tl, rig, { at: CUT.panel, duration: 1, from: ROW_NAME, to: ROW_NAME });
    focusRow(tl, rows, 0, CUT.panel);
    sheen(tl, sheenList, CUT.panel + 40, 420);
    pulseStatus(tl, status, CUT.panel + 80, 240);
    glide(tl, rig, { at: CUT.panel + 360, duration: 720, from: ROW_NAME, to: STATUS_RUN });
    pulseStatus(tl, status, CUT.panel + 1100, 280);
    pulseStatus(tl, status, CUT.panel + 1500, 260);

    hardCut(tl, runs, card2, CUT.card2);
    cardIn(tl, card2, CUT.card2);

    hardCut(tl, card2, runs, CUT.live);
    rest(tl, list, { at: CUT.live, duration: 1, from: 0, to: 0 });
    rest(tl, run, { at: CUT.live, duration: 1, from: 1, to: 1 });
    travel3d(tl, rig, { at: CUT.live, duration: 1, from: LIVE_WIDE, to: LIVE_WIDE });
    sheen(tl, sheenRun, CUT.live + 40, 480);
    pulseStatus(tl, liveStatus, CUT.live + 160, 280);
    loopSweep(tl, sweep, CUT.live + 80, 3);
    loopPacket(tl, packets[0] ?? null, { at: CUT.live + 80, wait: 0, cycles: 3 });
    loopPacket(tl, packets[1] ?? null, { at: CUT.live + 80, wait: 700, cycles: 3 });
    loopPacket(tl, packets[2] ?? null, { at: CUT.live + 80, wait: 1400, cycles: 3 });
    loopRing(tl, rings[0] ?? null, { at: CUT.live + 80, wait: 0, cycles: 3 });
    loopRing(tl, rings[1] ?? null, { at: CUT.live + 80, wait: 1050, cycles: 3 });
    tickDots.forEach((dot, i) => {
      loopDot(tl, dot, { at: CUT.live + 80, wait: i * 250, cycles: 5 });
    });
    clipSwap(tl, activity, {
      at: CUT.live + 900,
      text: 'Provisioning execution runtime',
      duration: 200,
    });

    const nodesAt = CUT.live + 1680;
    tl.at(nodesAt, () => {
      link.classList.add('is-off');
      nodeStage.classList.add('is-on');
    });
    showSolo(tl, solos, 0, nodesAt + 40, true);
    loopSheen(tl, nodeSheen, nodesAt + 40, 2);
    markDots(tl, dots, 1, 1, nodesAt + 80);
    clipSwap(tl, count, { at: nodesAt + 80, text: '2 / 5', duration: 160 });
    clipSwap(tl, elapsed, { at: nodesAt + 120, text: '5.6s', duration: 160 });

    showSolo(tl, solos, 1, nodesAt + 780);
    markDots(tl, dots, 2, 2, nodesAt + 820);
    clipSwap(tl, count, { at: nodesAt + 820, text: '3 / 5', duration: 160 });
    clipSwap(tl, elapsed, { at: nodesAt + 860, text: '6.8s', duration: 160 });

    showSolo(tl, solos, 2, nodesAt + 1560);
    markDots(tl, dots, 3, 3, nodesAt + 1600);
    clipSwap(tl, count, { at: nodesAt + 1600, text: '4 / 5', duration: 160 });
    clipSwap(tl, elapsed, { at: nodesAt + 1640, text: '7.9s', duration: 160 });

    tl.at(CUT.live + 3900, () => {
      liveView.classList.add('is-off');
      settledView.classList.add('is-on');
      railOn.classList.remove('is-run');
      railOn.classList.add('is-done');
      railMeta.textContent = 'Completed · $0.12';
      hero.classList.remove('is-run');
      hero.classList.add('is-done');
    });
    clipSwap(tl, status, { at: CUT.live + 3900, text: 'Completed', duration: 160 });
    travel3d(tl, rig, { at: CUT.live + 3900, duration: 1, from: LIVE_WIDE, to: LIVE_WIDE });
    sheen(tl, sheenRun, CUT.live + 3960, 420);

    hardCut(tl, runs, card3, CUT.card3);
    cardIn(tl, card3, CUT.card3);

    hardCut(tl, card3, runs, CUT.surfaces);
    rest(tl, run, { at: CUT.surfaces, duration: 1, from: 0, to: 0 });
    rest(tl, list, { at: CUT.surfaces, duration: 1, from: 1, to: 1 });
    travel3d(tl, rig, {
      at: CUT.surfaces,
      duration: 1,
      from: LIST_SURFACES,
      to: LIST_SURFACES,
    });
    sheen(tl, sheenList, CUT.surfaces + 40, 360);
    focusRow(tl, rows, 0, CUT.surfaces + 50);
    heatOne(tl, sources, sources[0]!, CUT.surfaces + 50);
    glide(tl, rig, {
      at: CUT.surfaces + 70,
      duration: 480,
      from: LIST_SURFACES,
      to: SRC_BUILDER,
    });
    pulseSrc(tl, sources[0]!, CUT.surfaces + 580);
    focusRow(tl, rows, 1, CUT.surfaces + 640);
    heatOne(tl, sources, sources[1]!, CUT.surfaces + 640);
    glide(tl, rig, {
      at: CUT.surfaces + 680,
      duration: 480,
      from: SRC_BUILDER,
      to: SRC_MARKET,
    });
    pulseSrc(tl, sources[1]!, CUT.surfaces + 1190);
    focusRow(tl, rows, 2, CUT.surfaces + 1250);
    heatOne(tl, sources, sources[2]!, CUT.surfaces + 1250);
    glide(tl, rig, {
      at: CUT.surfaces + 1290,
      duration: 480,
      from: SRC_MARKET,
      to: SRC_DEMO,
    });
    pulseSrc(tl, sources[2]!, CUT.surfaces + 1800);
    focusRow(tl, rows, 3, CUT.surfaces + 1860);
    heatOne(tl, sources, sources[3]!, CUT.surfaces + 1860);
    glide(tl, rig, {
      at: CUT.surfaces + 1900,
      duration: 480,
      from: SRC_DEMO,
      to: SRC_API,
    });
    pulseSrc(tl, sources[3]!, CUT.surfaces + 2410);
    focusRow(tl, rows, 4, CUT.surfaces + 2470);
    heatOne(tl, sources, sources[4]!, CUT.surfaces + 2470);
    glide(tl, rig, {
      at: CUT.surfaces + 2510,
      duration: 480,
      from: SRC_API,
      to: SRC_MCP,
    });
    pulseSrc(tl, sources[4]!, CUT.surfaces + 3020);
    heatAll(tl, sources, CUT.surfaces + 3140);
    tl.at(CUT.surfaces + 3140, () => rows.forEach((row) => row.classList.remove('is-focus')));
    glide(tl, rig, {
      at: CUT.surfaces + 3140,
      duration: 260,
      from: SRC_MCP,
      to: LIST_HERO,
    });

    hardCut(tl, runs, card4, CUT.card4);
    cardIn(tl, card4, CUT.card4);
    travel3d(tl, rig, { at: CUT.card4, duration: 2200, from: LIST_HERO, to: LIST_HERO });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.line, .head, .row').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
    stage.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
      screen.style.opacity = screen.dataset.screen === 'card-4' ? '1' : '0';
    });
  },
});
