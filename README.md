# edgaze-motion

A motion system for Edgaze product clips. Scenes are standalone pages at true pixel size. Preview them, export MP4 or MOV, throw the page away.

The craft lives in `src/lib` and `.cursor/rules`. A new scene should take minutes, not hours.

## Commands

```bash
npm install
npm run dev          # dashboard at /
npm run new -- 002 pricing-model
npm run typecheck
npm run lint
npm run format
npm test
npm run build
npm run ci
```

## Dashboard

`npm run dev` opens the recordings dashboard. Scenes first, finished clips under them.

Export steps the scene in Chrome at 60fps, captures the 1920×1080 stage at 2× (3840×2160), and writes H.264. The file is saved to `recordings/` and downloaded to the machine. Play a clip from the list. Escape closes the viewer.

Needs Google Chrome plus system `ffmpeg`. `npm install` also fetches Playwright's small ffmpeg helper used for the capture.

## Record

Manual capture is still there if you want it:

1. Open a scene.
2. Click **Record**. Chrome hides, the page goes black.
3. Screen-record the stage, or click **MP4** / **MOV** instead.
4. Press Escape to leave record view.

Do not commit video. `recordings/` is gitignored so clone stays fast. See `SPEC.md` section 8.

## Author a scene

A scene folder is only `index.html` and `scene.ts`. Markup and a storyboard of absolute millisecond timings. Compose primitives from `src/lib`. If you need a new behaviour, add it there with a comment that explains why it exists.

Drop photos, videos, and GIFs in `src/assets/photos`, `videos`, and `gifs`. Name the file after the slot (`01.jpg`, `loop.mp4`). In markup, `<div class="plate" data-asset="photos/01"><i></i></div>`, then `plateIn` in the storyboard. See `src/assets/README.md`.

Colours and curves come from `src/styles/tokens.css` via `var()`. Nothing else.
