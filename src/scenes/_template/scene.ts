import { barAt, cameraPush, gridMap, mountStage, slam, units } from '../../lib/index';

/**
 * Cut to a beat map, never to raw ms. For a licensed track:
 *   npm run beats -- music/<name>   → read src/assets/music/<name>.beats.md
 *   import MAP from '../../assets/music/<name>.beats.json';
 * and pass music: { slot: 'music/<name>' } to mountStage.
 */
const DURATION = 6000;
const BPM = 120;
const MAP = gridMap(BPM, DURATION);
const B = (bar: number, beat = 0) => barAt(MAP, bar, beat);

mountStage({
  width: 1920,
  height: 1080,
  duration: DURATION,
  bpm: BPM,
  beats: MAP,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: DURATION });
    slam(tl, units(stage.querySelector('[data-screen="title"]')!), {
      at: B(1, 1) - 70,
      step: 250,
    });
  },
  score(s) {
    s.pads(B(1), B(4), [
      [53, 57, 60, 64],
      [48, 55, 64, 67],
    ]);
    s.hit(B(1, 1));
  },
  still(stage) {
    stage.querySelectorAll<HTMLElement>('.m > i').forEach((el) => {
      el.style.transform = 'none';
    });
    const camera = stage.querySelector<HTMLElement>('.camera');
    if (camera) camera.style.transform = 'scale(1.032)';
  },
});
