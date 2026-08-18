import { cameraPush, drift, mountStage, reveal, units } from '../../lib/index';

mountStage({
  width: 1920,
  height: 1080,
  duration: 6000,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: 6000 });
    drift(tl, stage.querySelector('.bloom.c')!, { duration: 6000, dx: 60, dy: 40 });
    drift(tl, stage.querySelector('.bloom.p')!, { duration: 6000, dx: -50, dy: -36 });

    reveal(tl, units(stage.querySelector('.eyebrow')!), { at: 200 });
    reveal(tl, units(stage.querySelector('h1')!), { at: 400, step: 60 });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.m > i').forEach((el) => {
      el.style.transform = 'translateY(0)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
  },
});
