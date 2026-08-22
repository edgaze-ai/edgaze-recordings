import '../../styles/scene-004.css';
import {
  breathe,
  cameraPush,
  clipSwap,
  drawPath,
  ease,
  hardCut,
  land,
  mountStage,
  press,
  pressBurst,
  reveal,
  Timeline,
  travel3d,
  typeOut,
} from '../../lib/index';

const DURATION = 40000;
const PROMPT = 'Pull a YouTube transcript and summarize it with Claude.';
const REPLY =
  "I'll add YouTube Transcript, Claude, and a Workflow Output.\n\nPaste a URL. Captions come in, Claude writes a short digest, and you can send it.";
const OUTPUT =
  'A 12-minute talk on shipping workflows without the ceremony.\n\nStart from a transcript, not a blank page. Let Claude draft the digest. Then send it, or publish the same graph so anyone can run it.\n\nThree takeaways, ready to copy.';
const YT_URL = 'youtu.be/edgaze-os';

function fade(
  tl: Timeline,
  el: Element,
  at: number,
  from: number,
  to: number,
  duration = 420,
  y = 10,
): void {
  tl.add(
    el,
    [
      { transform: `translateY(${from === 0 ? y : 0}px)`, opacity: from },
      { transform: `translateY(${to === 0 ? y : 0}px)`, opacity: to },
    ],
    { delay: at, duration, easing: ease.expo, fill: 'forwards' },
  );
}

function cardIn(tl: Timeline, screen: HTMLElement, at: number): void {
  const line = screen.querySelector<HTMLElement>('.line');
  if (line) land(tl, line, { at, duration: 520, from: 1.08 });
}

function heat(node: HTMLElement, on: boolean, running = false): void {
  node.classList.toggle('is-hot', on && !running);
  node.classList.toggle('is-run', running);
}

function nodePort(node: HTMLElement, side: 'in' | 'out'): { x: number; y: number } {
  const face = node.querySelector<HTMLElement>('.face');
  if (!face) return { x: 0, y: 0 };
  return {
    x: node.offsetLeft + (side === 'out' ? face.offsetWidth + 4 : -4),
    y: node.offsetTop + face.offsetHeight / 2,
  };
}

function routeEdge(
  path: SVGPathElement,
  from: { x: number; y: number },
  to: { x: number; y: number },
): void {
  const mid = (from.x + to.x) / 2;
  path.setAttribute(
    'd',
    `M${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${mid.toFixed(1)} ${from.y.toFixed(1)}, ${mid.toFixed(1)} ${to.y.toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`,
  );
}

function blink(tl: Timeline, el: HTMLElement, at: number, duration: number, times = 3): void {
  const slice = duration / times;
  for (let i = 0; i < times; i += 1) {
    tl.add(
      el,
      [
        { transform: 'scaleY(0.35)', opacity: 0 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.18 },
        { transform: 'scaleY(1)', opacity: 1, offset: 0.58 },
        { transform: 'scaleY(0.35)', opacity: 0 },
      ],
      { delay: at + i * slice, duration: slice, easing: ease.expo, fill: 'forwards' },
    );
  }
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
    const card5 = stage.querySelector<HTMLElement>('[data-screen="card-5"]')!;
    const phone = stage.querySelector<HTMLElement>('[data-screen="phone"]')!;
    const rig = phone.querySelector<HTMLElement>('.phone')!;
    const spec = phone.querySelector<HTMLElement>('[data-spec]')!;
    const washBand = phone.querySelector<HTMLElement>('.wash .band');
    const washC = phone.querySelector<HTMLElement>('.wash .side-c');
    const washP = phone.querySelector<HTMLElement>('.wash .side-p');
    const glow = (el: HTMLElement | null, opts: Parameters<typeof breathe>[2]): void => {
      if (el) breathe(tl, el, opts);
    };

    const composer = phone.querySelector<HTMLElement>('[data-view="composer"]')!;
    const graph = phone.querySelector<HTMLElement>('[data-view="graph"]')!;
    const empty = phone.querySelector<HTMLElement>('[data-empty]')!;
    const thread = phone.querySelector<HTMLElement>('[data-thread]')!;
    const prompt = phone.querySelector<HTMLElement>('[data-prompt]');
    const ask = phone.querySelector<HTMLElement>('[data-ask]')!;
    const send = phone.querySelector<HTMLElement>('[data-send]')!;
    const sendIcon = phone.querySelector<HTMLElement>('[data-send-icon]');
    const stopIcon = phone.querySelector<HTMLElement>('[data-stop-icon]');
    const burst = phone.querySelector<HTMLElement>('[data-burst]')!;
    const caret = phone.querySelector<HTMLElement>('[data-caret]');
    const youText = phone.querySelector<HTMLElement>('[data-you-text]');
    const reply = phone.querySelector<HTMLElement>('[data-reply]');
    const reason = phone.querySelector<HTMLElement>('[data-reason]');
    const reasonLabel = phone.querySelector<HTMLElement>('[data-reason-label]');
    const runSheet = phone.querySelector<HTMLElement>('[data-sheet="run"]')!;
    const publish = phone.querySelector<HTMLElement>('[data-sheet="publish"]')!;
    const runInput = phone.querySelector<HTMLElement>('[data-run-input]')!;
    const runLive = phone.querySelector<HTMLElement>('[data-run-live]')!;
    const runOut = phone.querySelector<HTMLElement>('[data-run-out]')!;
    const urlField = phone.querySelector<HTMLElement>('[data-url]')!;
    const runCta = phone.querySelector<HTMLElement>('[data-run-cta]')!;
    const runProse = phone.querySelector<HTMLElement>('[data-run-prose]');
    const runStatus = phone.querySelector<HTMLElement>('[data-run-status]');
    const runCount = phone.querySelector<HTMLElement>('[data-run-count]');
    const runNode = phone.querySelector<HTMLElement>('[data-run-node]');
    const runHint = phone.querySelector<HTMLElement>('[data-run-hint]');
    const pubNav = phone.querySelector<HTMLElement>('.pub-nav');
    const pubDetails = phone.querySelector<HTMLElement>('[data-pub-details]')!;
    const pubPricing = phone.querySelector<HTMLElement>('[data-pub-pricing]')!;
    const pubMedia = phone.querySelector<HTMLElement>('[data-pub-media]')!;
    const pubVisibility = phone.querySelector<HTMLElement>('[data-pub-visibility]')!;
    const pubReview = phone.querySelector<HTMLElement>('[data-pub-review]')!;
    const pubDone = phone.querySelector<HTMLElement>('[data-pub-done]')!;
    const pubCta = phone.querySelector<HTMLElement>('[data-pub-cta]')!;
    const pubFoot = phone.querySelector<HTMLElement>('[data-pub-foot]')!;
    const pubFootCta = phone.querySelector<HTMLElement>('[data-pub-foot-cta]')!;
    const pubTitle = phone.querySelector<HTMLElement>('[data-pub-title]')!;
    const pubSub = phone.querySelector<HTMLElement>('[data-pub-sub]')!;
    const pubSteps = [...phone.querySelectorAll<HTMLElement>('[data-pub-step]')];
    const run = phone.querySelector<HTMLElement>('[data-run-g]')!;
    const yt = phone.querySelector<HTMLElement>('[data-node="yt"]')!;
    const llm = phone.querySelector<HTMLElement>('[data-node="llm"]')!;
    const out = phone.querySelector<HTMLElement>('[data-node="out"]')!;
    const edge1 = phone.querySelector<SVGPathElement>('[data-edge="1"]')!;
    const edge2 = phone.querySelector<SVGPathElement>('[data-edge="2"]')!;
    const wires = phone.querySelector<SVGSVGElement>('.wires');
    const canvas = phone.querySelector<HTMLElement>('[data-view="graph"] .canvas');
    if (wires && canvas) {
      const width = canvas.offsetWidth || 420;
      const height = canvas.offsetHeight || 798;
      wires.setAttribute('viewBox', `0 0 ${width} ${height}`);
      wires.setAttribute('width', String(width));
      wires.setAttribute('height', String(height));
      routeEdge(edge1, nodePort(yt, 'out'), nodePort(llm, 'in'));
      routeEdge(edge2, nodePort(llm, 'out'), nodePort(out, 'in'));
    }

    if (prompt) prompt.textContent = '';
    if (youText) youText.textContent = '';
    if (reply) reply.textContent = '';
    if (reasonLabel) reasonLabel.textContent = '';
    if (urlField) urlField.textContent = '';
    if (runProse) runProse.textContent = '';
    ask.classList.remove('is-hot', 'is-run');
    send.classList.remove('is-ready', 'is-run');
    if (sendIcon) {
      sendIcon.style.opacity = '';
      sendIcon.style.transform = '';
    }
    if (stopIcon) {
      stopIcon.style.opacity = '';
      stopIcon.style.transform = '';
    }
    empty.style.opacity = '';
    thread.style.opacity = '';
    if (reply) reply.style.opacity = '';
    if (reason) reason.style.opacity = '';
    composer.style.opacity = '';
    graph.style.opacity = '';
    runSheet.style.opacity = '';
    publish.style.opacity = '';
    runInput.style.opacity = '';
    runLive.style.opacity = '';
    runOut.style.opacity = '';
    pubDetails.style.opacity = '';
    pubPricing.style.opacity = '';
    pubMedia.style.opacity = '';
    pubVisibility.style.opacity = '';
    pubReview.style.opacity = '';
    pubDone.style.opacity = '';
    pubFoot.style.opacity = '';
    if (pubNav) pubNav.style.opacity = '';
    if (pubTitle) pubTitle.textContent = 'Publish';
    if (pubSub) pubSub.textContent = 'Step 1 of 5';
    if (pubCta) pubCta.textContent = 'Continue';
    if (pubFootCta) pubFootCta.textContent = 'Continue';
    if (runStatus) runStatus.textContent = 'Running';
    if (runCount) runCount.textContent = '1 / 3';
    if (runHint) runHint.textContent = 'Plain text';
    if (runNode) runNode.textContent = 'YouTube Transcript';
    pubSteps.forEach((step, i) => step.classList.toggle('is-on', i === 0));
    [yt, llm, out].forEach((node) => heat(node, false));

    cardIn(tl, card1, 180);
    hardCut(tl, card1, phone, 3000);

    travel3d(tl, rig, {
      at: 3000,
      duration: 2400,
      from: { o: 0, s: 0.78, ry: 16, rx: 7, y: 36 },
      to: { o: 1, s: 0.92, ry: 8, rx: 3, y: 0 },
    });
    travel3d(tl, rig, {
      at: 5480,
      duration: 3400,
      from: { o: 1, s: 0.92, ry: 8, rx: 3, y: 0 },
      to: { o: 1, s: 0.98, ry: 4, rx: 1, y: -14 },
    });

    glow(washBand, {
      at: 3040,
      duration: 7800,
      from: 0.92,
      mid: 1.1,
      to: 1.02,
      peak: 1,
      rest: 0.78,
      fadeFrom: 0,
      dx: 70,
      dy: -36,
    });
    glow(washC, {
      at: 3100,
      duration: 7800,
      from: 0.94,
      mid: 1.12,
      to: 1.04,
      peak: 0.92,
      rest: 0.64,
      fadeFrom: 0,
      dx: -90,
      dy: 40,
    });
    glow(washP, {
      at: 3160,
      duration: 7800,
      from: 0.94,
      mid: 1.12,
      to: 1.04,
      peak: 0.9,
      rest: 0.62,
      fadeFrom: 0,
      dx: 110,
      dy: 28,
    });
    glow(washBand, {
      at: 11000,
      duration: 9800,
      from: 1.02,
      mid: 1.12,
      to: 1.04,
      peak: 0.95,
      rest: 0.76,
      fadeFrom: 0.78,
      dx: -90,
      dy: 48,
    });
    glow(washC, {
      at: 11060,
      duration: 9800,
      from: 1.04,
      mid: 1.14,
      to: 1.06,
      peak: 0.88,
      rest: 0.6,
      fadeFrom: 0.64,
      dx: 130,
      dy: -36,
    });
    glow(washP, {
      at: 11120,
      duration: 9800,
      from: 1.04,
      mid: 1.14,
      to: 1.06,
      peak: 0.86,
      rest: 0.58,
      fadeFrom: 0.62,
      dx: -80,
      dy: 64,
    });
    glow(washBand, {
      at: 23400,
      duration: 7200,
      from: 1.04,
      mid: 1.1,
      to: 1.02,
      peak: 0.9,
      rest: 0.72,
      fadeFrom: 0.76,
      dx: 60,
      dy: -44,
    });
    glow(washC, {
      at: 23460,
      duration: 7200,
      from: 1.06,
      mid: 1.12,
      to: 1.04,
      peak: 0.84,
      rest: 0.58,
      fadeFrom: 0.6,
      dx: -110,
      dy: 30,
    });
    glow(washP, {
      at: 23520,
      duration: 7200,
      from: 1.06,
      mid: 1.12,
      to: 1.04,
      peak: 0.82,
      rest: 0.56,
      fadeFrom: 0.58,
      dx: 100,
      dy: 40,
    });

    tl.add(
      spec,
      [
        { transform: 'translateX(-48%)', opacity: 0 },
        { transform: 'translateX(18%)', opacity: 0.7, offset: 0.42 },
        { transform: 'translateX(92%)', opacity: 0 },
      ],
      { delay: 3480, duration: 4200, easing: ease.travel, fill: 'forwards' },
    );

    hardCut(tl, phone, card2, 9000);
    cardIn(tl, card2, 9080);
    hardCut(tl, card2, phone, 11000);

    travel3d(tl, rig, {
      at: 11000,
      duration: 1480,
      from: { o: 1, s: 0.98, ry: 4, rx: 1, y: -14 },
      to: { o: 1, s: 2.18, ry: 0, rx: 0, y: -768 },
    });

    ask.classList.remove('is-hot', 'is-run');
    send.classList.remove('is-ready', 'is-run');
    if (caret) blink(tl, caret, 11480, 2280, 4);
    if (prompt) typeOut(tl, prompt, { at: 11540, text: PROMPT, step: 32 });
    tl.at(11540, () => send.classList.add('is-ready'));
    tl.at(13740, () => ask.classList.add('is-hot'));
    press(tl, send, { at: 14180, duration: 380 });
    pressBurst(tl, burst, { at: 14200, count: 8, gap: 22 });
    if (sendIcon) {
      tl.add(
        sendIcon,
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.6) translateY(4px)', opacity: 0 },
        ],
        { delay: 14240, duration: 220, easing: ease.expo, fill: 'forwards' },
      );
    }
    if (stopIcon) {
      tl.add(
        stopIcon,
        [
          { transform: 'scale(0.6) translateY(-4px)', opacity: 0 },
          { transform: 'scale(1) translateY(0)', opacity: 1 },
        ],
        { delay: 14300, duration: 240, easing: ease.expo, fill: 'forwards' },
      );
    }
    tl.at(14300, () => {
      send.classList.remove('is-ready');
      send.classList.add('is-run');
      ask.classList.add('is-run');
      ask.classList.remove('is-hot');
      if (prompt) prompt.textContent = '';
      if (youText) youText.textContent = PROMPT;
    });
    fade(tl, empty, 14280, 1, 0, 280, 8);
    fade(tl, thread, 14340, 0, 1, 360, 10);
    travel3d(tl, rig, {
      at: 14320,
      duration: 920,
      from: { o: 1, s: 2.18, ry: 0, rx: 0, y: -768 },
      to: { o: 1, s: 1.22, ry: 1, rx: 0, y: -42 },
    });
    if (reason) fade(tl, reason, 15040, 0, 1, 280, 6);
    tl.at(15040, () => {
      if (reasonLabel) reasonLabel.textContent = 'Reading workflow';
    });
    if (reasonLabel) reveal(tl, [reasonLabel], { at: 15100, duration: 520, step: 0 });
    if (reasonLabel)
      clipSwap(tl, reasonLabel, { at: 15680, text: 'Drafting changes', duration: 300 });
    if (reasonLabel) {
      clipSwap(tl, reasonLabel, { at: 16300, text: 'Applying changes', duration: 300 });
    }
    if (reasonLabel) {
      clipSwap(tl, reasonLabel, { at: 16920, text: 'Checking workflow', duration: 300 });
    }
    if (reason) fade(tl, reason, 17540, 1, 0, 240, 6);
    if (reply) fade(tl, reply, 17600, 0, 1, 280, 8);
    if (reply) typeOut(tl, reply, { at: 17660, text: REPLY, step: 16 });

    fade(tl, composer, 20200, 1, 0, 200, 8);
    fade(tl, graph, 20260, 0, 1, 280, 10);
    travel3d(tl, rig, {
      at: 20200,
      duration: 860,
      from: { o: 1, s: 1.22, ry: 1, rx: 0, y: -42 },
      to: { o: 1, s: 1.04, ry: -3, rx: 1, y: 0 },
    });
    land(tl, yt, { at: 20680, duration: 520, from: 1.08 });
    land(tl, llm, { at: 21200, duration: 520, from: 1.08 });
    tl.at(21200, () => heat(yt, true));
    drawPath(tl, edge1, { at: 21260, duration: 480 });
    land(tl, out, { at: 21720, duration: 480, from: 1.08 });
    tl.at(21720, () => heat(llm, true));
    drawPath(tl, edge2, { at: 21780, duration: 420 });
    tl.at(22140, () => heat(out, true));

    hardCut(tl, phone, card3, 22200);
    cardIn(tl, card3, 22280);
    hardCut(tl, card3, phone, 23400);

    travel3d(tl, rig, {
      at: 23400,
      duration: 720,
      from: { o: 1, s: 1.04, ry: -3, rx: 1, y: 0 },
      to: { o: 1, s: 1.02, ry: 1, rx: 0, y: 0 },
    });

    fade(tl, runSheet, 23620, 0, 1, 420, 16);
    typeOut(tl, urlField, { at: 24200, text: YT_URL, step: 38 });
    press(tl, runCta, { at: 25680, duration: 360 });
    press(tl, run, { at: 25740, duration: 360 });
    fade(tl, runInput, 26040, 1, 0, 240, 8);
    fade(tl, runLive, 26100, 0, 1, 360, 8);
    tl.at(26140, () => heat(yt, true, true));
    tl.at(27040, () => {
      heat(yt, true);
      heat(llm, true, true);
      if (runStatus) runStatus.textContent = 'Streaming';
      if (runCount) runCount.textContent = '2 / 3';
      if (runHint) runHint.textContent = 'Claude';
      if (runNode) runNode.textContent = 'LLM Chat';
    });
    tl.at(28020, () => {
      heat(llm, true);
      heat(out, true, true);
      if (runCount) runCount.textContent = '3 / 3';
      if (runHint) runHint.textContent = 'Auto';
      if (runNode) runNode.textContent = 'Workflow Output';
    });
    fade(tl, runLive, 28340, 1, 0, 240, 8);
    fade(tl, runOut, 28400, 0, 1, 360, 8);
    tl.at(28440, () => heat(out, true));
    if (runProse) typeOut(tl, runProse, { at: 28480, text: OUTPUT, step: 11 });
    fade(tl, runSheet, 31120, 1, 0, 280, 12);

    hardCut(tl, phone, card4, 31400);
    cardIn(tl, card4, 31480);
    hardCut(tl, card4, phone, 32400);

    travel3d(tl, rig, {
      at: 32400,
      duration: 640,
      from: { o: 1, s: 1.02, ry: 1, rx: 0, y: 0 },
      to: { o: 1, s: 1.03, ry: -2, rx: 1, y: 0 },
    });
    fade(tl, publish, 32600, 0, 1, 400, 16);
    const markStep = (index: number, label: string, cta: string): void => {
      if (pubSub) pubSub.textContent = label;
      if (pubCta) pubCta.textContent = cta;
      if (pubFootCta) pubFootCta.textContent = cta;
      pubSteps.forEach((step, i) => step.classList.toggle('is-on', i === index));
    };
    press(tl, pubCta, { at: 33480, duration: 300 });
    press(tl, pubFootCta, { at: 33540, duration: 300 });
    fade(tl, pubDetails, 33780, 1, 0, 220, 8);
    fade(tl, pubPricing, 33840, 0, 1, 320, 8);
    tl.at(33840, () => markStep(1, 'Step 2 of 5', 'Continue'));
    press(tl, pubCta, { at: 34320, duration: 280 });
    fade(tl, pubPricing, 34560, 1, 0, 220, 8);
    fade(tl, pubMedia, 34620, 0, 1, 320, 8);
    tl.at(34620, () => markStep(2, 'Step 3 of 5', 'Continue'));
    press(tl, pubCta, { at: 35060, duration: 280 });
    fade(tl, pubMedia, 35300, 1, 0, 220, 8);
    fade(tl, pubVisibility, 35360, 0, 1, 320, 8);
    tl.at(35360, () => markStep(3, 'Step 4 of 5', 'Continue'));
    press(tl, pubCta, { at: 35760, duration: 280 });
    fade(tl, pubVisibility, 36000, 1, 0, 220, 8);
    fade(tl, pubReview, 36060, 0, 1, 320, 8);
    tl.at(36060, () => markStep(4, 'Step 5 of 5', 'Publish'));
    press(tl, pubCta, { at: 36480, duration: 300 });
    press(tl, pubFootCta, { at: 36540, duration: 300 });
    fade(tl, pubReview, 36780, 1, 0, 220, 8);
    fade(tl, pubDone, 36840, 0, 1, 340, 8);
    fade(tl, pubFoot, 36900, 1, 0, 220, 6);
    if (pubNav) fade(tl, pubNav, 36960, 1, 0, 220, 6);
    tl.at(36840, () => {
      if (pubTitle) pubTitle.textContent = 'Published';
      if (pubSub) pubSub.textContent = '';
      if (pubCta) pubCta.textContent = 'Done';
    });

    travel3d(tl, rig, {
      at: 37120,
      duration: 680,
      from: { o: 1, s: 1.03, ry: -2, rx: 1, y: 0 },
      to: { o: 1, s: 0.78, ry: -10, rx: 4, y: 8 },
    });
    fade(tl, publish, 37640, 1, 0, 280, 12);
    glow(washBand, {
      at: 37120,
      duration: 680,
      from: 1,
      mid: 1.16,
      to: 1.08,
      peak: 1,
      rest: 0.84,
      fadeFrom: 0.7,
      dx: 40,
      dy: -20,
    });
    glow(washC, {
      at: 37180,
      duration: 680,
      from: 1,
      mid: 1.18,
      to: 1.08,
      peak: 0.94,
      rest: 0.7,
      fadeFrom: 0.6,
      dx: -100,
      dy: 16,
    });
    glow(washP, {
      at: 37240,
      duration: 680,
      from: 1,
      mid: 1.18,
      to: 1.08,
      peak: 0.92,
      rest: 0.68,
      fadeFrom: 0.58,
      dx: 120,
      dy: 24,
    });
    tl.add(
      spec,
      [
        { transform: 'translateX(-36%)', opacity: 0 },
        { transform: 'translateX(24%)', opacity: 0.55, offset: 0.5 },
        { transform: 'translateX(80%)', opacity: 0 },
      ],
      { delay: 37200, duration: 700, easing: ease.travel, fill: 'forwards' },
    );

    hardCut(tl, phone, card5, 37800);
    cardIn(tl, card5, 37880);
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.line').forEach((el) => {
      el.style.transform = 'scale(1)';
      el.style.opacity = '1';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
    const card5 = stage.querySelector<HTMLElement>('[data-screen="card-5"]');
    const phone = stage.querySelector<HTMLElement>('[data-screen="phone"]');
    if (card5) card5.style.opacity = '1';
    if (phone) phone.style.opacity = '0';
  },
});
