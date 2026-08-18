import {
  cameraPush,
  countUp,
  drawPath,
  drift,
  ghostTrail,
  mountStage,
  popIn,
  reveal,
  units,
  wipeX,
} from '../../lib/index';

const DURATION = 10000;

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });
    drift(tl, stage.querySelector('.bloom.c')!, { duration: DURATION, dx: 80, dy: 50 });
    drift(tl, stage.querySelector('.bloom.p')!, { duration: DURATION, dx: -70, dy: -45 });

    reveal(tl, units(stage.querySelector('.eyebrow')!), { at: 200 });
    reveal(tl, units(stage.querySelector('h1')!), { at: 400, step: 60 });
    wipeX(tl, stage.querySelector('.rule')!, { at: 1050 });

    const nodes = [...stage.querySelectorAll<HTMLElement>('.node')];
    const glows = [...stage.querySelectorAll<HTMLElement>('.glow')];
    popIn(tl, nodes, { at: 1300, step: 140, duration: 640 });

    const path = stage.querySelector<SVGPathElement>('#wire')!;
    const host = stage.querySelector<HTMLElement>('.trail-host')!;
    const d = path.getAttribute('d') ?? '';
    ghostTrail(tl, { host, d, at: 2500, duration: 2800 });
    drawPath(tl, path, { at: 2500, duration: 2800 });

    popIn(tl, [glows[0]!], { at: 2500, duration: 420, step: 0 });
    popIn(tl, [glows[1]!], { at: 3900, duration: 420, step: 0 });
    popIn(tl, [glows[2]!], { at: 5300, duration: 420, step: 0 });
    tl.at(2500, () => nodes[0]?.classList.add('on'));
    tl.at(3900, () => nodes[1]?.classList.add('on'));
    tl.at(5300, () => nodes[2]?.classList.add('on'));

    countUp(tl, stage.querySelector('#c1')!, { to: 184, at: 3800, suffix: ' ms' });
    countUp(tl, stage.querySelector('#c2')!, { to: 1280, at: 3960 });
    reveal(tl, units(stage.querySelector('.foot')!), { at: 4200, step: 55 });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.m > i').forEach((el) => {
      el.style.transform = 'translateY(0)';
    });
    const rule = stage.querySelector<HTMLElement>('.rule');
    if (rule) rule.style.transform = 'scaleX(1)';
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
    stage.querySelectorAll('.node').forEach((node) => node.classList.add('on'));
    stage.querySelectorAll<HTMLElement>('.glow').forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    const c1 = stage.querySelector('#c1');
    const c2 = stage.querySelector('#c2');
    if (c1) c1.textContent = '184 ms';
    if (c2) c2.textContent = '1,280';
    const path = stage.querySelector<SVGPathElement>('#wire');
    if (path) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = '0';
    }
  },
});
