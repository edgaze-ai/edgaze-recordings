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

`npm run dev` opens the dashboard at `/`. It lists the scenes with their frame (16:9 or 9:16), their length and when they were last exported. The latest export plays on the right, with that scene's recordings under it.

- `/` filters the scenes. The frame toggle (All, 16:9, 9:16) is remembered.
- The arrow keys move the selection, Enter opens the scene, and double-click opens it too.
- MP4 and MOV export from a scene row. An export started in any tab shows its progress here.

Export steps the scene in Chrome at 60fps, captures the stage at 2× (3840×2160 or 2160×3840), renders the scene's soundtrack, and muxes both. MP4 is H.264 + AAC for posting; MOV is a ProRes 422 HQ master. The file is saved to `recordings/` and downloaded to the machine.

Needs Google Chrome plus system `ffmpeg`. `npm install` also fetches Playwright's small ffmpeg helper used for the capture.

## Editor

Each scene opens in a dark editor. The stage fits above a docked timeline. Icon controls sit over the timeline, and every icon has a tooltip with its shortcut. The timeline has a ruler, the beat map's sections and bars (drops are pink) and the rendered audio waveform. Click or drag anywhere on it to scrub.

| Key        | Action                |
| ---------- | --------------------- |
| Space      | Play / pause          |
| , and .    | Step one frame        |
| ← → or J L | Step 1s (Shift: 5s)   |
| Home / End | Start / end           |
| R          | Replay from the start |
| S          | Quarter speed         |
| M          | Mute the preview      |

**Mute applies to the preview only.** It is remembered across reloads and across scenes. Exports render the mix offline and always carry the full soundtrack.

**Edits while the editor is open.** When files change in a burst (an agent saving many files), the editor reloads once, after the saves settle. It waits until you finish scrubbing, and it resumes at the same playhead with the same play state. The export capture page never reloads, so an edit can't cut into an export. CSS changes still hot-swap without a reload.

## Record

Manual capture is still there if you want it:

1. Open a scene.
2. Click **Record** (the circle icon). The editor hides and the stage fills the window.
3. Screen-record the stage, or click **MP4** / **MOV** instead.
4. Press Escape to leave record view.

Do not commit video. `recordings/` is gitignored so clone stays fast. See `SPEC.md` section 8.

## Music and beats

Scenes cut to a beat map. A scene's `score(s)` is synthesized and plays in preview (Sound toggle) and in every export. To use a licensed track, drop it in `src/assets/music/`, run `npm run beats -- music/<name>`, read the generated `.beats.md`, and import the `.beats.json` as the scene's map. Verify an export with `npm run beats -- recordings/<clip>.mp4`.

## Author a scene

A scene folder is only `index.html` and `scene.ts`. Markup and a storyboard of absolute millisecond timings. Compose primitives from `src/lib`. If you need a new behaviour, add it there with a comment that explains why it exists.

Drop photos, videos, and GIFs in `src/assets/photos`, `videos`, and `gifs`. Name the file after the slot (`01.jpg`, `loop.mp4`). In markup, `<div class="plate" data-asset="photos/01"><i></i></div>`, then `plateIn` in the storyboard. See `src/assets/README.md`.

Colours and curves come from `src/styles/tokens.css` via `var()`. Nothing else.
