import { cameraPush, mountStage, reveal, units } from '../../lib/index';

mountStage({
  width: 1920,
  height: 1080,
  duration: 6000,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: 6000 });
    reveal(tl, units(stage.querySelector('[data-screen="title"]')!), { at: 280, step: 0 });
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.m > i, .plate > i').forEach((el) => {
      el.style.transform = 'translateY(0)';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
  },
});
