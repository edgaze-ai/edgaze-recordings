import '../../styles/scene-005.css';
import {
  breathe,
  cameraPush,
  clipSwap,
  drawPath,
  ease,
  ghostTrail,
  hardCut,
  land,
  mountStage,
  type Pose3,
  Timeline,
  travel3d,
} from '../../lib/index';

const DURATION = 28000;

const CUT = {
  card2: 1200,
  scale: 2400,
  card3: 7400,
  fail: 8600,
  card4: 13600,
  recover: 14800,
  card5: 19800,
  steady: 21000,
  card6: 26000,
} as const;

const TIGHT: Pose3 = { x: 1420, y: 80, z: 180, rx: 6, ry: -8, s: 2.18 };
const TIGHT_IN: Pose3 = { x: 1460, y: 70, z: 210, rx: 5, ry: -7, s: 2.26 };
const PAIR: Pose3 = { x: 620, y: 24, z: 40, rx: 9, ry: -6, s: 1.42 };
const FULL: Pose3 = { x: 0, y: 12, z: 36, rx: 12, ry: -3, s: 1.16 };
const FULL_HOLD: Pose3 = { x: 10, y: 8, z: 18, rx: 11, ry: -2, s: 1.12 };
const FAIL: Pose3 = { x: 360, y: 420, z: 160, rx: 7, ry: -6, s: 1.78 };
const FAIL_IN: Pose3 = { x: 400, y: 510, z: 220, rx: 5, ry: -4, s: 2.22 };
const FAIL_HOLD: Pose3 = { x: 412, y: 528, z: 240, rx: 4, ry: -3, s: 2.28 };
const RECOVER: Pose3 = { x: 40, y: 22, z: 48, rx: 10, ry: -1, s: 1.12 };
const HERO: Pose3 = { x: 0, y: 18, z: -280, rx: 18, ry: 12, s: 0.66 };
const HERO_END: Pose3 = { x: 28, y: 10, z: -220, rx: 16, ry: 16, s: 0.7 };

const DEPTHS: Pose3[] = [
  { x: -980, y: -240, z: -480, s: 0.72, o: 0.5 },
  { x: 1020, y: -260, z: -580, s: 0.66, o: 0.42 },
  { x: -820, y: 340, z: -720, s: 0.6, o: 0.34 },
  { x: 880, y: 320, z: -840, s: 0.54, o: 0.28 },
  { x: 40, y: -400, z: -980, s: 0.5, o: 0.24 },
];

const FACE = 143;
const NODE_AT: Record<string, { x: number; y: number }> = {
  form: { x: 24, y: 288 },
  scrape: { x: 276, y: 128 },
  youtube: { x: 276, y: 288 },
  http: { x: 276, y: 448 },
  chat: { x: 528, y: 48 },
  image: { x: 528, y: 248 },
  embed: { x: 528, y: 448 },
  merge: { x: 780, y: 148 },
  cond: { x: 780, y: 388 },
  loop: { x: 1032, y: 148 },
  delay: { x: 1032, y: 388 },
  out: { x: 1284, y: 268 },
};

const EDGES: [string, string, string][] = [
  ['form-scrape', 'form', 'scrape'],
  ['form-youtube', 'form', 'youtube'],
  ['form-http', 'form', 'http'],
  ['scrape-chat', 'scrape', 'chat'],
  ['youtube-image', 'youtube', 'image'],
  ['http-embed', 'http', 'embed'],
  ['chat-merge', 'chat', 'merge'],
  ['image-merge', 'image', 'merge'],
  ['embed-cond', 'embed', 'cond'],
  ['merge-loop', 'merge', 'loop'],
  ['cond-delay', 'cond', 'delay'],
  ['loop-out', 'loop', 'out'],
  ['delay-out', 'delay', 'out'],
];

type NodeState = 'idle' | 'run' | 'done' | 'fail';

function cardIn(tl: Timeline, screen: HTMLElement, at: number): void {
  const line = screen.querySelector<HTMLElement>('.line');
  if (line) land(tl, line, { at, duration: 520, from: 1.1 });
}

function landOut(
  tl: Timeline,
  el: HTMLElement | null,
  { at, duration = 380, to = 1.1 }: { at: number; duration?: number; to?: number },
): void {
  if (!el) return;
  tl.add(
    el,
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: `scale(${to})`, opacity: 0 },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

function nodeOf(scope: ParentNode, id: string): HTMLElement {
  return scope.querySelector<HTMLElement>(`[data-node="${id}"]`)!;
}

function portAt(id: string, side: 'in' | 'out'): { x: number; y: number } {
  const node = NODE_AT[id];
  if (!node) return { x: 0, y: 0 };
  return {
    x: node.x + (side === 'out' ? FACE + 4 : -4),
    y: node.y + FACE / 2,
  };
}

function routeEdge(path: SVGPathElement, fromId: string, toId: string): string {
  const a = portAt(fromId, 'out');
  const b = portAt(toId, 'in');
  const mid = (a.x + b.x) / 2;
  const d = `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C ${mid.toFixed(1)} ${a.y.toFixed(1)}, ${mid.toFixed(1)} ${b.y.toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  path.setAttribute('d', d);
  return d;
}

function paintEdge(path: SVGPathElement, hidden = false): void {
  const len = path.getTotalLength();
  if (len < 1) return;
  path.style.strokeDasharray = `${len}`;
  path.style.strokeDashoffset = hidden ? `${len}` : '0';
}

function routeDag(dag: HTMLElement): Map<string, string> {
  const paths = new Map<string, string>();
  for (const [id, fromId, toId] of EDGES) {
    const path = dag.querySelector<SVGPathElement>(`[data-edge="${id}"]`);
    if (!path) continue;
    paths.set(id, routeEdge(path, fromId, toId));
    paintEdge(path, true);
  }
  return paths;
}

function showEdges(scope: ParentNode): void {
  scope.querySelectorAll<SVGPathElement>('.edge').forEach((path) => paintEdge(path));
}

function setNode(node: HTMLElement, state: NodeState): void {
  node.classList.toggle('is-run', state === 'run');
  node.classList.toggle('is-done', state === 'done');
  node.classList.toggle('is-fail', state === 'fail');
  node.querySelector('.face')?.classList.toggle('is-run', state === 'run');
  node.querySelectorAll<HTMLElement>('.port').forEach((port) => {
    port.classList.toggle('is-on', state === 'run' || state === 'done');
  });
}

function pulse(tl: Timeline, node: HTMLElement, at: number, duration = 520, rest = 0): void {
  const halo = node.querySelector<HTMLElement>('.halo');
  if (!halo) return;
  tl.add(
    halo,
    [
      { transform: 'scale(0.94)', opacity: 0 },
      { transform: 'scale(1.06)', opacity: 0.7, offset: 0.38 },
      { transform: 'scale(1)', opacity: rest },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

function failOnce(tl: Timeline, node: HTMLElement, at: number): void {
  const halo = node.querySelector<HTMLElement>('.halo-fail');
  if (halo) {
    tl.add(
      halo,
      [
        { transform: 'scale(0.96)', opacity: 0 },
        { transform: 'scale(1.04)', opacity: 0.72, offset: 0.3 },
        { transform: 'scale(1)', opacity: 0.22 },
      ],
      { delay: at, duration: 640, easing: ease.expo, fill: 'forwards' },
    );
  }
  tl.at(at, () => setNode(node, 'fail'));
}

function heatEdge(
  tl: Timeline,
  path: SVGPathElement | null,
  at: number,
  duration: number,
): void {
  if (!path) return;
  drawPath(tl, path, { at, duration });
  tl.at(at, () => path.classList.add('is-hot'));
  tl.at(at + duration, () => path.classList.remove('is-hot'));
}

function glowEdge(
  tl: Timeline,
  path: SVGPathElement | null,
  at: number,
  duration: number,
): void {
  if (!path) return;
  paintEdge(path);
  tl.at(at, () => path.classList.add('is-hot'));
  tl.at(at + duration, () => path.classList.remove('is-hot'));
}

function stampField(hero: HTMLElement, field: HTMLElement): HTMLElement[] {
  return DEPTHS.map((_, i) => {
    const copy = hero.cloneNode(true) as HTMLElement;
    copy.dataset.dag = 'field';
    copy.dataset.depth = String(i + 1);
    copy.dataset.lite = '';
    copy.querySelector('[data-ghosts]')?.remove();
    field.append(copy);
    routeDag(copy);
    return copy;
  });
}

function runThenDone(tl: Timeline, node: HTMLElement, at: number, hold = 420, rest = 0): void {
  tl.at(at, () => setNode(node, 'run'));
  pulse(tl, node, at, 520, rest);
  tl.at(at + hold, () => setNode(node, 'done'));
}

function runField(tl: Timeline, dag: HTMLElement, at: number): void {
  const nodes = [...dag.querySelectorAll<HTMLElement>('.wf-node')];
  const edges = [...dag.querySelectorAll<SVGPathElement>('.edge')];
  nodes.forEach((node, i) => {
    runThenDone(tl, node, at + i * 60, 400, 0.26);
  });
  edges.forEach((path, i) => {
    heatEdge(tl, path, at + 80 + i * 55, 220);
  });
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });

    const card1 = stage.querySelector<HTMLElement>('[data-screen="card-1"]')!;
    const card3 = stage.querySelector<HTMLElement>('[data-screen="card-3"]')!;
    const card4 = stage.querySelector<HTMLElement>('[data-screen="card-4"]')!;
    const card5 = stage.querySelector<HTMLElement>('[data-screen="card-5"]')!;
    const card6 = stage.querySelector<HTMLElement>('[data-screen="card-6"]')!;
    const runtime = stage.querySelector<HTMLElement>('[data-screen="runtime"]')!;
    const rig = runtime.querySelector<HTMLElement>('[data-rig]')!;
    const field = runtime.querySelector<HTMLElement>('[data-field]')!;
    const hero = runtime.querySelector<HTMLElement>('[data-dag="hero"]')!;
    const ghosts = hero.querySelector<HTMLElement>('[data-ghosts]')!;
    const driftC = runtime.querySelector<HTMLElement>('[data-drift="c"]')!;
    const driftP = runtime.querySelector<HTMLElement>('[data-drift="p"]')!;

    const paths = routeDag(hero);
    const copies = stampField(hero, field);

    const form = nodeOf(hero, 'form');
    const scrape = nodeOf(hero, 'scrape');
    const youtube = nodeOf(hero, 'youtube');
    const http = nodeOf(hero, 'http');
    const chat = nodeOf(hero, 'chat');
    const image = nodeOf(hero, 'image');
    const embed = nodeOf(hero, 'embed');
    const merge = nodeOf(hero, 'merge');
    const cond = nodeOf(hero, 'cond');
    const loop = nodeOf(hero, 'loop');
    const delay = nodeOf(hero, 'delay');
    const out = nodeOf(hero, 'out');
    const edge = (id: string) => hero.querySelector<SVGPathElement>(`[data-edge="${id}"]`);

    travel3d(tl, rig, { at: 0, duration: 1, from: TIGHT, to: TIGHT });
    copies.forEach((copy, i) => {
      travel3d(tl, copy, {
        at: 0,
        duration: 1,
        from: { ...DEPTHS[i]!, o: 0 },
        to: { ...DEPTHS[i]!, o: 0 },
      });
    });

    const lead = card1.querySelector<HTMLElement>('[data-line="a"]');
    const turn = card1.querySelector<HTMLElement>('[data-line="b"]');
    if (lead) land(tl, lead, { at: 40, duration: 520, from: 1.1 });
    landOut(tl, lead, { at: CUT.card2, duration: 320 });
    if (turn) land(tl, turn, { at: CUT.card2 + 380, duration: 520, from: 1.1 });
    hardCut(tl, card1, runtime, CUT.scale);

    travel3d(tl, rig, { at: CUT.scale, duration: 800, from: TIGHT, to: TIGHT_IN });
    land(tl, form, { at: CUT.scale + 40, duration: 320, from: 1.08 });
    runThenDone(tl, form, CUT.scale + 80, 420);
    heatEdge(tl, edge('form-scrape'), CUT.scale + 460, 280);
    const first = paths.get('form-scrape');
    if (first) {
      ghostTrail(tl, {
        host: ghosts,
        d: first,
        at: CUT.scale + 460,
        duration: 280,
        count: 8,
        gap: 22,
        size: 12,
      });
    }

    land(tl, scrape, { at: CUT.scale + 520, duration: 320, from: 1.08 });
    runThenDone(tl, scrape, CUT.scale + 580, 380);
    land(tl, youtube, { at: CUT.scale + 680, duration: 320, from: 1.08 });
    land(tl, http, { at: CUT.scale + 740, duration: 320, from: 1.08 });
    runThenDone(tl, youtube, CUT.scale + 720, 380);
    runThenDone(tl, http, CUT.scale + 780, 380);
    heatEdge(tl, edge('form-youtube'), CUT.scale + 700, 240);
    heatEdge(tl, edge('form-http'), CUT.scale + 760, 240);

    travel3d(tl, rig, { at: CUT.scale + 800, duration: 1100, from: TIGHT_IN, to: PAIR });
    heatEdge(tl, edge('scrape-chat'), CUT.scale + 980, 260);
    heatEdge(tl, edge('youtube-image'), CUT.scale + 1040, 260);
    heatEdge(tl, edge('http-embed'), CUT.scale + 1100, 260);
    land(tl, chat, { at: CUT.scale + 1040, duration: 320, from: 1.08 });
    land(tl, image, { at: CUT.scale + 1100, duration: 320, from: 1.08 });
    land(tl, embed, { at: CUT.scale + 1160, duration: 320, from: 1.08 });
    runThenDone(tl, chat, CUT.scale + 1120, 400);
    runThenDone(tl, image, CUT.scale + 1180, 400);
    runThenDone(tl, embed, CUT.scale + 1240, 400);

    travel3d(tl, rig, { at: CUT.scale + 1900, duration: 1100, from: PAIR, to: FULL });
    land(tl, merge, { at: CUT.scale + 1980, duration: 320, from: 1.08 });
    land(tl, cond, { at: CUT.scale + 2040, duration: 320, from: 1.08 });
    heatEdge(tl, edge('chat-merge'), CUT.scale + 1920, 280);
    heatEdge(tl, edge('image-merge'), CUT.scale + 1980, 280);
    heatEdge(tl, edge('embed-cond'), CUT.scale + 2040, 280);
    runThenDone(tl, merge, CUT.scale + 2160, 360);
    runThenDone(tl, cond, CUT.scale + 2220, 360);
    land(tl, loop, { at: CUT.scale + 2280, duration: 320, from: 1.08 });
    land(tl, delay, { at: CUT.scale + 2340, duration: 320, from: 1.08 });
    heatEdge(tl, edge('merge-loop'), CUT.scale + 2100, 280);
    heatEdge(tl, edge('cond-delay'), CUT.scale + 2160, 280);
    runThenDone(tl, loop, CUT.scale + 2460, 340);
    runThenDone(tl, delay, CUT.scale + 2520, 340);
    land(tl, out, { at: CUT.scale + 2580, duration: 320, from: 1.08 });
    heatEdge(tl, edge('loop-out'), CUT.scale + 2220, 280);
    heatEdge(tl, edge('delay-out'), CUT.scale + 2280, 280);
    runThenDone(tl, out, CUT.scale + 2700, 320);
    tl.at(CUT.scale + 2600, () => showEdges(hero));

    travel3d(tl, rig, { at: CUT.scale + 3000, duration: 1900, from: FULL, to: FULL_HOLD });

    hardCut(tl, runtime, card3, CUT.card3);
    cardIn(tl, card3, CUT.card3 + 40);
    travel3d(tl, rig, { at: CUT.card3, duration: 1100, from: FULL_HOLD, to: FAIL });
    tl.at(CUT.card3, () => {
      setNode(form, 'done');
      setNode(scrape, 'done');
      setNode(youtube, 'done');
      setNode(http, 'done');
      setNode(image, 'done');
      setNode(embed, 'done');
      setNode(chat, 'run');
      setNode(merge, 'idle');
      setNode(cond, 'idle');
      setNode(loop, 'idle');
      setNode(delay, 'idle');
      setNode(out, 'idle');
    });

    hardCut(tl, card3, runtime, CUT.fail);
    travel3d(tl, rig, { at: CUT.fail, duration: 900, from: FAIL, to: FAIL });
    pulse(tl, chat, CUT.fail + 80, 560);
    const chatHint = chat.querySelector<HTMLElement>('.hint')!;
    failOnce(tl, chat, CUT.fail + 1000);
    clipSwap(tl, chatHint, { at: CUT.fail + 1000, text: 'Failed', duration: 280 });
    travel3d(tl, rig, { at: CUT.fail + 1000, duration: 720, from: FAIL, to: FAIL_IN });
    travel3d(tl, rig, { at: CUT.fail + 1720, duration: 3180, from: FAIL_IN, to: FAIL_HOLD });

    hardCut(tl, runtime, card4, CUT.card4);
    cardIn(tl, card4, CUT.card4 + 40);

    hardCut(tl, card4, runtime, CUT.recover);
    travel3d(tl, rig, { at: CUT.recover, duration: 4900, from: FAIL_HOLD, to: RECOVER });
    clipSwap(tl, chatHint, { at: CUT.recover + 360, text: 'Draft', duration: 240 });
    tl.at(CUT.recover + 480, () => setNode(chat, 'run'));
    pulse(tl, chat, CUT.recover + 480, 520);
    tl.at(CUT.recover + 900, () => setNode(chat, 'done'));
    glowEdge(tl, edge('chat-merge'), CUT.recover + 940, 240);
    runThenDone(tl, merge, CUT.recover + 1180, 360);
    glowEdge(tl, edge('embed-cond'), CUT.recover + 1280, 220);
    runThenDone(tl, cond, CUT.recover + 1480, 340);
    glowEdge(tl, edge('merge-loop'), CUT.recover + 1800, 200);
    glowEdge(tl, edge('cond-delay'), CUT.recover + 1860, 200);
    runThenDone(tl, loop, CUT.recover + 2040, 320);
    runThenDone(tl, delay, CUT.recover + 2100, 320);
    glowEdge(tl, edge('loop-out'), CUT.recover + 2400, 180);
    glowEdge(tl, edge('delay-out'), CUT.recover + 2460, 180);
    runThenDone(tl, out, CUT.recover + 2620, 300);

    hardCut(tl, runtime, card5, CUT.card5);
    cardIn(tl, card5, CUT.card5 + 40);
    copies.forEach((copy, i) => {
      travel3d(tl, copy, {
        at: CUT.card5,
        duration: 1,
        from: { ...DEPTHS[i]!, o: 0 },
        to: { ...DEPTHS[i]!, o: 0.08 },
      });
    });

    hardCut(tl, card5, runtime, CUT.steady);
    travel3d(tl, rig, { at: CUT.steady, duration: 1600, from: RECOVER, to: HERO });
    copies.forEach((copy, i) => {
      travel3d(tl, copy, {
        at: CUT.steady + 80 + i * 60,
        duration: 420,
        from: { ...DEPTHS[i]!, o: 0.08 },
        to: DEPTHS[i]!,
      });
      runField(tl, copy, CUT.steady + 400 + i * 110);
    });
    breathe(tl, driftC, {
      at: CUT.steady + 80,
      duration: 4800,
      from: 0.92,
      mid: 1.08,
      to: 1.02,
      peak: 0.36,
      rest: 0.22,
      fadeFrom: 0,
      dx: 80,
      dy: -24,
    });
    breathe(tl, driftP, {
      at: CUT.steady + 160,
      duration: 4720,
      from: 0.9,
      mid: 1.1,
      to: 1.03,
      peak: 0.3,
      rest: 0.18,
      fadeFrom: 0,
      dx: -70,
      dy: 20,
    });
    travel3d(tl, rig, { at: CUT.steady + 1600, duration: 3300, from: HERO, to: HERO_END });

    hardCut(tl, runtime, card6, CUT.card6);
    land(tl, card6.querySelector<HTMLElement>('.lockup')!, {
      at: CUT.card6 + 40,
      duration: 560,
      from: 1.12,
    });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.line, .lockup').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
    stage.querySelectorAll<HTMLElement>('.screen').forEach((screen) => {
      screen.style.opacity = screen.dataset.screen === 'card-6' ? '1' : '0';
    });
  },
});
