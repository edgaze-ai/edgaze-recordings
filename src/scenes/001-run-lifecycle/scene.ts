import {
  cameraPush,
  conceal,
  drawPath,
  ghostTrail,
  mountStage,
  popIn,
  reveal,
  units,
} from '../../lib/index';

const DURATION = 10000;

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });

    const title = stage.querySelector<HTMLElement>('[data-screen="title"]')!;
    const graph = stage.querySelector<HTMLElement>('[data-screen="graph"]')!;
    reveal(tl, units(title), { at: 280, step: 0 });
    conceal(tl, units(title), { at: 2800, step: 0 });

    popIn(tl, [graph], { at: 3600, duration: 720, step: 0 });

    const nodes = [...stage.querySelectorAll<HTMLElement>('.node')];
    const glows = [...stage.querySelectorAll<HTMLElement>('.glow')];
    popIn(tl, nodes, { at: 4000, step: 140, duration: 640 });

    const path = stage.querySelector<SVGPathElement>('#wire')!;
    const host = stage.querySelector<HTMLElement>('.trail-host')!;
    const d = path.getAttribute('d') ?? '';
    ghostTrail(tl, { host, d, at: 5200, duration: 2800 });
    drawPath(tl, path, { at: 5200, duration: 2800 });

    popIn(tl, [glows[0]!], { at: 5200, duration: 420, step: 0 });
    popIn(tl, [glows[1]!], { at: 6600, duration: 420, step: 0 });
    popIn(tl, [glows[2]!], { at: 8000, duration: 420, step: 0 });
    tl.at(5200, () => nodes[0]?.classList.add('on'));
    tl.at(6600, () => nodes[1]?.classList.add('on'));
    tl.at(8000, () => nodes[2]?.classList.add('on'));
  },
  still(stage) {
    const title = stage.querySelector<HTMLElement>('[data-screen="title"]');
    const graph = stage.querySelector<HTMLElement>('[data-screen="graph"]');
    if (title) title.style.opacity = '0';
    if (graph) {
      graph.style.opacity = '1';
      graph.style.transform = 'scale(1)';
    }
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
    stage.querySelectorAll<HTMLElement>('.node').forEach((node) => {
      node.classList.add('on');
      node.style.opacity = '1';
      node.style.transform = 'scale(1)';
    });
    stage.querySelectorAll<HTMLElement>('.glow').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const path = stage.querySelector<SVGPathElement>('#wire');
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = '0';
    }
  },
});
