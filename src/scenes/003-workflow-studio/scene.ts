import '../../styles/scene-003.css';
import {
  bloom,
  breathe,
  cameraPush,
  clipSwap,
  crossfade,
  drawPath,
  drift,
  ease,
  hardCut,
  land,
  mountStage,
  press,
  pressBurst,
  Timeline,
  travel3d,
  tunnel,
  typeOut,
} from '../../lib/index';

const DURATION = 40000;
const PROMPT = 'Scrape example.com/article and summarize it.';
const REPLY =
  "I'll scrape the article, loop a summary over each section, and return a clean digest.";

function cardIn(tl: Timeline, screen: HTMLElement, at: number): void {
  const line = screen.querySelector<HTMLElement>('.line');
  if (line) land(tl, line, { at, duration: 520, from: 1.1 });
}

function fade(
  tl: Timeline,
  el: Element,
  at: number,
  from: number,
  to: number,
  duration = 260,
): void {
  tl.add(
    el,
    [
      { transform: 'translateY(6px)', opacity: from },
      { transform: 'translateY(0)', opacity: to },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

function lightPorts(node: HTMLElement, on: boolean): void {
  node.classList.toggle('is-on', on);
  node.querySelectorAll<HTMLElement>('.port').forEach((port) => {
    port.classList.toggle('is-on', on);
  });
}

function heatRow(row: HTMLElement, on: boolean): void {
  row.classList.toggle('is-hot', on);
}

function holdOp(tl: Timeline, el: Element, at: number, opacity: number): void {
  tl.add(
    el,
    [
      { transform: 'translateY(0)', opacity },
      { transform: 'translateY(0)', opacity },
    ],
    { delay: at, duration: 80, easing: ease.expo, fill: 'forwards' },
  );
}

function holdDesk(tl: Timeline, el: HTMLElement, at: number, from: number, to: number): void {
  tl.add(
    el,
    [
      { transform: 'translateY(22px) scale(1.16)', opacity: from },
      { transform: 'translateY(22px) scale(1.16)', opacity: to },
    ],
    { delay: at, duration: 480, easing: ease.expo, fill: 'forwards' },
  );
}

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });

    const card1 = stage.querySelector<HTMLElement>('[data-screen="card-1"]')!;
    card1.classList.remove('is-rush');
    const studio = stage.querySelector<HTMLElement>('[data-screen="studio"]')!;
    const card2 = stage.querySelector<HTMLElement>('[data-screen="card-2"]')!;
    const card3 = stage.querySelector<HTMLElement>('[data-screen="card-3"]')!;
    const card4 = stage.querySelector<HTMLElement>('[data-screen="card-4"]')!;
    const card5 = stage.querySelector<HTMLElement>('[data-screen="card-5"]')!;
    const card6 = stage.querySelector<HTMLElement>('[data-screen="card-6"]')!;

    const desk = studio.querySelector<HTMLElement>('.desk')!;
    const rig = studio.querySelector<HTMLElement>('.rig')!;
    const heroWash = stage.querySelector<HTMLElement>('[data-hero-wash]')!;
    const heroPlane = stage.querySelector<HTMLElement>('[data-plane="hero"]')!;
    const heroEmpty = stage.querySelector<HTMLElement>('[data-hero-empty]')!;
    const heroThread = stage.querySelector<HTMLElement>('[data-hero-thread]')!;
    const heroYou = stage.querySelector<HTMLElement>('[data-hero-you]')!;
    const heroYouText = stage.querySelector<HTMLElement>('[data-hero-you-text]')!;
    const heroReason = stage.querySelector<HTMLElement>('[data-hero-reason]')!;
    const heroReasonLabel = stage.querySelector<HTMLElement>('[data-hero-reason-label]')!;
    const heroReply = stage.querySelector<HTMLElement>('[data-hero-reply]')!;
    const heroAsk = stage.querySelector<HTMLElement>('[data-hero-ask]')!;
    const heroPrompt = stage.querySelector<HTMLElement>('[data-hero-prompt]')!;
    const heroCaret = stage.querySelector<HTMLElement>('[data-hero-caret]')!;
    const heroSend = stage.querySelector<HTMLElement>('[data-hero-send]')!;
    const heroSendIcon = stage.querySelector<HTMLElement>('[data-hero-send-icon]')!;
    const heroStopIcon = stage.querySelector<HTMLElement>('[data-hero-stop-icon]')!;
    const heroBurst = stage.querySelector<HTMLElement>('[data-hero-burst]')!;
    const heroWindow = stage.querySelector<HTMLElement>('[data-hero]')!;
    desk.style.visibility = '';
    heroWindow.style.transform = '';
    heroWindow.style.opacity = '';
    heroAsk.classList.remove('is-hot', 'is-run');
    heroSend.classList.remove('is-ready', 'is-run');
    heroPrompt.textContent = '';
    heroYouText.textContent = '';
    heroReasonLabel.textContent = '';
    heroReply.textContent = '';
    const bar = studio.querySelector<HTMLElement>('[data-plane="bar"]')!;
    const canvas = studio.querySelector<HTMLElement>('[data-plane="canvas"]')!;
    const left = studio.querySelector<HTMLElement>('[data-plane="left"]')!;
    const right = studio.querySelector<HTMLElement>('[data-plane="right"]')!;
    left.style.transformOrigin = '';
    right.style.transformOrigin = '';
    left.style.zIndex = '';
    right.style.zIndex = '';
    const loopPlane = studio.querySelector<HTMLElement>('[data-plane="loop"]')!;
    const canvasWires = canvas.querySelector<HTMLElement>('.wires')!;
    const atmosphere = studio.querySelector<HTMLElement>('[data-atmosphere]')!;
    const wash = studio.querySelector<HTMLElement>('[data-wash]')!;
    const glowC = studio.querySelector<HTMLElement>('[data-glow="c"]')!;
    const glowP = studio.querySelector<HTMLElement>('[data-glow="p"]')!;

    const composer = studio.querySelector<HTMLElement>('[data-pane="composer"]')!;
    const library = studio.querySelector<HTMLElement>('[data-pane="library"]')!;
    const titleComposer = studio.querySelector<HTMLElement>('[data-title="composer"]')!;
    const titleLibrary = studio.querySelector<HTMLElement>('[data-title="library"]')!;
    const composerEmpty = studio.querySelector<HTMLElement>('[data-empty]')!;
    const thread = studio.querySelector<HTMLElement>('[data-thread]')!;
    const you = studio.querySelector<HTMLElement>('[data-you]')!;
    const youText = studio.querySelector<HTMLElement>('[data-you-text]')!;
    const empty = studio.querySelector<HTMLElement>('[data-insp="empty"]')!;
    const scrapeInsp = studio.querySelector<HTMLElement>('[data-insp="scrape"]')!;
    const loopInsp = studio.querySelector<HTMLElement>('[data-insp="loop"]')!;
    const item = studio.querySelector<HTMLElement>('[data-item]')!;

    const graph = canvas.querySelector<HTMLElement>('.graph')!;
    graph.classList.remove('is-pair');
    const scrape = studio.querySelector<HTMLElement>('[data-node="scrape"]')!;
    const loop = studio.querySelector<HTMLElement>('[data-node="loop"]')!;
    const output = studio.querySelector<HTMLElement>('[data-node="output"]')!;
    const form = studio.querySelector<HTMLElement>('[data-node="form"]')!;
    const youtube = studio.querySelector<HTMLElement>('[data-node="youtube"]')!;
    const loopChat = studio.querySelector<HTMLElement>('[data-node="loop-chat"]')!;
    const loopDraft = studio.querySelector<HTMLElement>('[data-node="loop-draft"]')!;
    const loopTmpl = studio.querySelector<HTMLElement>('[data-node="loop-tmpl"]')!;
    const loopCount = studio.querySelector<HTMLElement>('.loop-count')!;

    const edge1 = studio.querySelector<SVGPathElement>('[data-edge="1"]')!;
    const edge2 = studio.querySelector<SVGPathElement>('[data-edge="2"]')!;
    const loopEdge1 = studio.querySelector<SVGPathElement>('[data-loop-edge="1"]')!;
    const loopEdge2 = studio.querySelector<SVGPathElement>('[data-loop-edge="2"]')!;

    const rowScrape = studio.querySelector<HTMLElement>('[data-row="scrape"]')!;
    const rowForm = studio.querySelector<HTMLElement>('[data-row="form"]')!;
    [scrape, loop, output, form, youtube].forEach((node) => lightPorts(node, false));
    [rowScrape, rowForm].forEach((row) => heatRow(row, false));

    cardIn(tl, card1, 0);
    const line = card1.querySelector<HTMLElement>('.line')!;
    line.style.visibility = '';
    const rebuilt = card1.querySelector<HTMLElement>('[data-rebuilt]')!;
    const tunnelHost = card1.querySelector<HTMLElement>('[data-tunnel]')!;
    const flare = card1.querySelector<HTMLElement>('[data-flare]')!;
    const lineBox = line.getBoundingClientRect();
    const wordBox = rebuilt.getBoundingClientRect();
    if (lineBox.width > 0) {
      line.style.transformOrigin = `${((wordBox.left + wordBox.width / 2 - lineBox.left) / lineBox.width) * 100}% 50%`;
    } else {
      line.style.transformOrigin = '72% 50%';
    }
    tunnel(tl, tunnelHost, { at: 620 });
    tl.at(680, () => card1.classList.add('is-rush'));
    tl.add(
      line,
      [
        { transform: 'translateZ(0) scale(1)', opacity: 1 },
        { transform: 'translateZ(0) scale(3.2)', opacity: 1, offset: 0.28 },
        { transform: 'translateZ(0) scale(8)', opacity: 0, offset: 0.56 },
        { transform: 'translateZ(0) scale(28)', opacity: 0 },
      ],
      { delay: 700, duration: 1400, easing: ease.linear, fill: 'forwards' },
    );
    tl.at(1500, () => {
      line.style.visibility = 'hidden';
    });
    bloom(tl, flare, { at: 1420, duration: 720 });
    tl.add(
      studio,
      [
        { transform: 'scale(1.04)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { delay: 2080, duration: 480, easing: ease.expo, fill: 'forwards' },
    );
    tl.add(
      card1,
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(0)', opacity: 0 },
      ],
      { delay: 2200, duration: 280, easing: ease.expo, fill: 'forwards' },
    );

    drift(tl, atmosphere, { at: 2280, duration: 37400, dx: 42, dy: -20 });
    breathe(tl, wash, {
      at: 2280,
      duration: 37400,
      from: 1,
      mid: 1.06,
      to: 1.03,
      peak: 0.5,
      rest: 0.36,
    });
    breathe(tl, glowC, {
      at: 2360,
      duration: 32440,
      from: 0.92,
      mid: 1.14,
      to: 1.04,
      peak: 0.28,
      rest: 0.16,
      dx: 36,
      dy: -18,
    });
    breathe(tl, glowP, {
      at: 2440,
      duration: 32360,
      from: 0.9,
      mid: 1.16,
      to: 1.05,
      peak: 0.24,
      rest: 0.14,
      dx: -40,
      dy: 16,
    });

    travel3d(tl, canvas, {
      at: 2280,
      duration: 480,
      from: { rx: 8, ry: -6, z: -40, s: 1.03, o: 0 },
      to: { rx: 5, ry: -4, z: 0, s: 1, o: 1 },
    });
    travel3d(tl, bar, {
      at: 2560,
      duration: 480,
      from: { rx: 5, ry: -4, z: 12, y: -12, o: 0 },
      to: { rx: 5, ry: -4, z: 12, y: 0, o: 1 },
    });
    travel3d(tl, left, {
      at: 2840,
      duration: 480,
      from: { rx: 5, ry: -4, z: 8, o: 0 },
      to: { rx: 5, ry: -4, z: 8, o: 1 },
    });
    travel3d(tl, right, {
      at: 3120,
      duration: 480,
      from: { rx: 5, ry: -4, z: 8, o: 0 },
      to: { rx: 5, ry: -4, z: 8, o: 1 },
    });
    travel3d(tl, rig, {
      at: 2360,
      duration: 4640,
      from: { x: 16, ry: 2, rx: 2, s: 1 },
      to: { x: -24, ry: -4, rx: 3, s: 1.02 },
    });

    hardCut(tl, studio, card2, 7000);
    cardIn(tl, card2, 7000);
    hardCut(tl, card2, studio, 8200);

    holdDesk(tl, desk, 8280, 1, 0);
    tl.at(8760, () => {
      desk.style.visibility = 'hidden';
    });
    fade(tl, heroWash, 8360, 0, 1, 520);
    tl.add(
      heroPlane,
      [
        { transform: 'translateY(14px)', opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 },
      ],
      { delay: 8440, duration: 480, easing: ease.expo, fill: 'forwards' },
    );
    tl.at(8520, () => heroAsk.classList.add('is-hot'));
    tl.at(8600, () => heroSend.classList.add('is-ready'));
    tl.add(
      heroCaret,
      [
        { transform: 'scaleY(0.35)', opacity: 0 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.08 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.48 },
        { transform: 'scaleY(0.4)', opacity: 0.12, offset: 0.54 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.62 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.92 },
        { transform: 'scaleY(0.35)', opacity: 0 },
      ],
      { delay: 8600, duration: 1480, easing: ease.expo, fill: 'forwards' },
    );
    typeOut(tl, heroPrompt, { at: 8600, text: PROMPT, step: 28 });

    press(tl, heroSend, { at: 10180 });
    pressBurst(tl, heroBurst, { at: 10200 });
    tl.add(
      heroSendIcon,
      [
        { transform: 'scale(1)', opacity: 1 },
        { transform: 'scale(0.6) translateY(4px)', opacity: 0 },
      ],
      { delay: 10240, duration: 220, easing: ease.expo, fill: 'forwards' },
    );
    tl.add(
      heroStopIcon,
      [
        { transform: 'scale(0.6) translateY(-4px)', opacity: 0 },
        { transform: 'scale(1) translateY(0)', opacity: 1 },
      ],
      { delay: 10300, duration: 240, easing: ease.expo, fill: 'forwards' },
    );
    tl.at(10300, () => {
      heroSend.classList.remove('is-ready');
      heroSend.classList.add('is-run');
      heroAsk.classList.add('is-run');
      heroPrompt.textContent = '';
      heroYouText.textContent = PROMPT;
      youText.textContent = PROMPT;
      you.style.opacity = '1';
      you.style.transform = 'none';
      composerEmpty.style.opacity = '0';
      thread.style.opacity = '1';
    });

    fade(tl, heroEmpty, 10300, 1, 0, 240);
    fade(tl, heroThread, 10360, 0, 1, 220);
    land(tl, heroYou, { at: 10420, duration: 360, from: 0.97 });
    fade(tl, heroReason, 10540, 0, 1, 220);
    tl.at(10540, () => {
      heroReasonLabel.textContent = 'Planning next moves';
    });
    tl.add(
      heroReasonLabel,
      [{ transform: 'translateY(115%)' }, { transform: 'translateY(0)' }],
      { delay: 10540, duration: 320, easing: ease.expo, fill: 'forwards' },
    );

    clipSwap(tl, heroReasonLabel, { at: 11140, text: 'Drafting the graph' });
    fade(tl, heroReply, 11200, 0, 1, 180);
    typeOut(tl, heroReply, { at: 11260, text: REPLY, step: 22 });

    clipSwap(tl, heroReasonLabel, { at: 13320, text: 'Applying changes' });

    fade(tl, heroWash, 13780, 1, 0, 640);
    tl.add(
      heroWindow,
      [
        { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
        { transform: 'translate(-24px, 16px) scale(0.36)', opacity: 0 },
      ],
      { delay: 13840, duration: 720, easing: ease.expo, fill: 'forwards' },
    );
    tl.at(13900, () => {
      desk.style.visibility = '';
    });
    tl.add(
      desk,
      [
        { transform: 'translateY(28px) scale(1.08)', opacity: 0 },
        { transform: 'translateY(22px) scale(1.16)', opacity: 1 },
      ],
      { delay: 13900, duration: 720, easing: ease.expo, fill: 'forwards' },
    );
    tl.add(
      heroPlane,
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(0)', opacity: 0 },
      ],
      { delay: 14520, duration: 160, easing: ease.expo, fill: 'forwards' },
    );
    travel3d(tl, rig, {
      at: 14040,
      duration: 880,
      from: { x: -24, y: 0, ry: -4, rx: 3, s: 1.02 },
      to: { x: 12, y: 8, ry: -1, rx: 3, s: 1.08 },
    });

    land(tl, scrape, { at: 14600, duration: 280, from: 0.92 });
    tl.at(14640, () => lightPorts(scrape, true));
    crossfade(tl, empty, scrapeInsp, { at: 14680, duration: 180 });

    land(tl, loop, { at: 15000, duration: 280, from: 0.92 });
    tl.at(15040, () => lightPorts(loop, true));
    drawPath(tl, edge1, { at: 15120, duration: 280, fill: 'forwards' });

    land(tl, output, { at: 15400, duration: 280, from: 0.92 });
    tl.at(15440, () => lightPorts(output, true));
    drawPath(tl, edge2, { at: 15520, duration: 280, fill: 'forwards' });

    hardCut(tl, studio, card3, 16800);
    cardIn(tl, card3, 16800);
    hardCut(tl, card3, studio, 18200);

    travel3d(tl, rig, {
      at: 18280,
      duration: 520,
      from: { x: 12, y: 8, ry: -1, rx: 3, s: 1.08 },
      to: { x: 0, y: 0, ry: 1, rx: 2, s: 1.05 },
    });
    tl.add(
      desk,
      [
        { transform: 'translateY(22px) scale(1.16)', opacity: 1 },
        { transform: 'translateY(8px) scale(1.04)', opacity: 1 },
      ],
      { delay: 18340, duration: 480, easing: ease.expo, fill: 'forwards' },
    );
    crossfade(tl, scrapeInsp, loopInsp, { at: 18520, duration: 160 });
    travel3d(tl, canvas, {
      at: 18580,
      duration: 360,
      from: { rx: 5, ry: -4, z: 0, s: 1, o: 1 },
      to: { rx: 5, ry: -4, z: -24, s: 0.96, o: 0.28 },
    });
    travel3d(tl, left, {
      at: 18640,
      duration: 360,
      from: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
      to: { rx: 5, ry: -4, z: -16, s: 0.96, o: 0.28 },
    });
    travel3d(tl, right, {
      at: 18700,
      duration: 360,
      from: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
      to: { rx: 5, ry: -4, z: -16, s: 0.96, o: 0.28 },
    });
    fade(tl, atmosphere, 18600, 1, 0, 320);
    fade(tl, canvasWires, 18720, 1, 0, 220);
    travel3d(tl, loopPlane, {
      at: 18780,
      duration: 400,
      from: { rx: 4, s: 0.86, o: 0 },
      to: { rx: 1, s: 0.92, o: 1 },
    });
    land(tl, loopChat, { at: 19120, duration: 240, from: 0.92 });
    tl.at(19160, () => lightPorts(loopChat, true));
    land(tl, loopDraft, { at: 19200, duration: 240, from: 0.92 });
    tl.at(19240, () => lightPorts(loopDraft, true));
    land(tl, loopTmpl, { at: 19280, duration: 240, from: 0.92 });
    tl.at(19320, () => lightPorts(loopTmpl, true));
    drawPath(tl, loopEdge1, { at: 19360, duration: 240, fill: 'forwards' });
    drawPath(tl, loopEdge2, { at: 19420, duration: 240, fill: 'forwards' });
    fade(tl, loopCount, 19400, 0, 1, 180);
    [19600, 20400, 21200, 22000].forEach((at, i) => {
      tl.at(at, () => {
        item.textContent = String(i + 1);
      });
    });

    hardCut(tl, studio, card4, 22800);
    cardIn(tl, card4, 22800);
    travel3d(tl, loopPlane, {
      at: 22880,
      duration: 80,
      from: { rx: 1, s: 0.92, o: 1 },
      to: { rx: 1, s: 0.92, o: 0 },
    });
    tl.add(
      desk,
      [
        { transform: 'translateY(8px) scale(1.04)', opacity: 1 },
        { transform: 'translateY(22px) scale(1.16)', opacity: 1 },
      ],
      { delay: 22880, duration: 80, easing: ease.expo, fill: 'forwards' },
    );
    fade(tl, atmosphere, 22880, 0, 1, 80);
    travel3d(tl, canvas, {
      at: 22880,
      duration: 80,
      from: { rx: 5, ry: -4, z: -24, s: 0.96, o: 0.28 },
      to: { rx: 5, ry: -4, z: 0, s: 1, o: 1 },
    });
    travel3d(tl, left, {
      at: 22940,
      duration: 80,
      from: { rx: 5, ry: -4, z: -16, s: 0.96, o: 0.28 },
      to: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
    });
    travel3d(tl, right, {
      at: 23000,
      duration: 80,
      from: { rx: 5, ry: -4, z: -16, s: 0.96, o: 0.28 },
      to: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
    });
    holdOp(tl, scrape, 22880, 0);
    holdOp(tl, loop, 22880, 0);
    holdOp(tl, output, 22880, 0);
    holdOp(tl, form, 22880, 0);
    holdOp(tl, youtube, 22880, 0);
    holdOp(tl, edge1, 22880, 0);
    holdOp(tl, edge2, 22880, 0);
    tl.at(22880, () => {
      graph.classList.add('is-pair');
      lightPorts(scrape, false);
      lightPorts(loop, false);
      lightPorts(output, false);
      lightPorts(form, false);
      lightPorts(youtube, false);
    });
    hardCut(tl, card4, studio, 24000);

    travel3d(tl, rig, {
      at: 24080,
      duration: 520,
      from: { x: 0, y: 0, ry: 1, rx: 2, s: 1.05 },
      to: { x: 20, y: 6, ry: 3, rx: 2, s: 1.12 },
    });
    crossfade(tl, titleComposer, titleLibrary, { at: 24140, duration: 180 });
    crossfade(tl, composer, library, { at: 24180, duration: 200 });
    crossfade(tl, loopInsp, empty, { at: 24240, duration: 180 });

    fade(tl, rowScrape, 24400, 0.72, 1, 180);
    tl.at(24400, () => heatRow(rowScrape, true));
    land(tl, scrape, { at: 24520, duration: 360, from: 1.08 });
    tl.at(24600, () => lightPorts(scrape, true));
    fade(tl, rowScrape, 25720, 1, 0.72, 160);
    tl.at(25720, () => heatRow(rowScrape, false));

    fade(tl, rowForm, 25840, 0.72, 1, 180);
    tl.at(25840, () => heatRow(rowForm, true));
    land(tl, form, { at: 25960, duration: 360, from: 1.08 });
    tl.at(26040, () => lightPorts(form, true));
    fade(tl, rowForm, 29120, 1, 0.72, 160);
    tl.at(29120, () => heatRow(rowForm, false));

    hardCut(tl, studio, card5, 29600);
    cardIn(tl, card5, 29600);
    holdOp(tl, loop, 29680, 1);
    holdOp(tl, output, 29680, 1);
    holdOp(tl, edge1, 29680, 1);
    holdOp(tl, edge2, 29680, 1);
    holdOp(tl, form, 29680, 0);
    holdOp(tl, youtube, 29680, 0);
    tl.at(29680, () => {
      graph.classList.remove('is-pair');
      lightPorts(loop, true);
      lightPorts(output, true);
      lightPorts(form, false);
      lightPorts(youtube, false);
      left.style.transformOrigin = '0% 8%';
      right.style.transformOrigin = '100% 8%';
      left.style.zIndex = '5';
      right.style.zIndex = '5';
    });
    crossfade(tl, empty, loopInsp, { at: 29700, duration: 160 });
    hardCut(tl, card5, studio, 30800);

    travel3d(tl, rig, {
      at: 30880,
      duration: 640,
      from: { x: 20, y: 6, ry: 3, rx: 2, s: 1.12 },
      to: { x: 0, y: 12, ry: -2, rx: 5, s: 0.96 },
    });
    travel3d(tl, canvas, {
      at: 31520,
      duration: 520,
      from: { rx: 5, ry: -4, z: 0, s: 1, o: 1 },
      to: { rx: 6, ry: -3, z: -28, s: 0.96, o: 1 },
    });

    travel3d(tl, left, {
      at: 31640,
      duration: 880,
      from: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
      to: { x: 188, y: 28, z: 36, rx: 3, ry: -2, sx: 1.2, sy: 1.1, o: 1 },
    });
    travel3d(tl, right, {
      at: 31720,
      duration: 880,
      from: { rx: 5, ry: -4, z: 8, s: 1, o: 1 },
      to: { x: -188, y: 28, z: 36, rx: 3, ry: -2, sx: 1.2, sy: 1.1, o: 1 },
    });

    travel3d(tl, left, {
      at: 32600,
      duration: 720,
      from: { x: 188, y: 28, z: 36, rx: 3, ry: -2, sx: 1.2, sy: 1.1, o: 1 },
      to: { x: 248, y: -16, z: 44, rx: 2, ry: -1, sx: 1.28, sy: 1.16, o: 1 },
    });
    travel3d(tl, right, {
      at: 32680,
      duration: 720,
      from: { x: -188, y: 28, z: 36, rx: 3, ry: -2, sx: 1.2, sy: 1.1, o: 1 },
      to: { x: -248, y: -16, z: 44, rx: 2, ry: -1, sx: 1.28, sy: 1.16, o: 1 },
    });

    travel3d(tl, left, {
      at: 33480,
      duration: 1100,
      from: { x: 248, y: -16, z: 44, rx: 2, ry: -1, sx: 1.28, sy: 1.16, o: 1 },
      to: { x: -56, y: 20, z: 18, rx: 4, ry: -3, sx: 1.36, sy: 1.22, o: 1 },
    });
    travel3d(tl, right, {
      at: 33560,
      duration: 1100,
      from: { x: -248, y: -16, z: 44, rx: 2, ry: -1, sx: 1.28, sy: 1.16, o: 1 },
      to: { x: 56, y: 20, z: 18, rx: 4, ry: -3, sx: 1.36, sy: 1.22, o: 1 },
    });
    travel3d(tl, rig, {
      at: 33640,
      duration: 1800,
      from: { x: 0, y: 12, ry: -2, rx: 5, s: 0.96 },
      to: { x: -10, y: 6, ry: -3, rx: 4, s: 0.94 },
    });

    hardCut(tl, studio, card6, 35600);
    land(tl, card6.querySelector<HTMLElement>('.lockup')!, {
      at: 35600,
      duration: 440,
      from: 1.12,
    });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.screen').forEach((el) => {
      el.style.opacity = '0';
    });
    const end = stage.querySelector<HTMLElement>('[data-screen="card-6"]');
    if (end) end.style.opacity = '1';
    stage.querySelectorAll<HTMLElement>('.line, .lockup').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
  },
});
