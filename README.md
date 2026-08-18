# edgaze-motion

A motion system for Edgaze product clips. Scenes are standalone pages at true pixel size. Preview them, hit Record, capture the frame, throw the page away.

The craft lives in `src/lib` and `.cursor/rules`. A new scene should take minutes, not hours.

## Commands

```bash
npm install
npm run dev          # gallery at /
npm run new -- 002 pricing-model
npm run typecheck
npm run lint
npm run format
npm test
npm run build
npm run ci
```

## Record

1. Open a scene.
2. Click **Record**. Chrome hides, the page goes black, the stage scales to `max(1 / dpr, min(1, fit))`.
3. Screen-record the stage.
4. Press Escape to leave record view.
5. Put the file in object storage or a GitHub Release. Link it from `recordings/INDEX.md`.

Do not commit video. `recordings/` is gitignored so clone stays fast. See `SPEC.md` section 8.

## Author a scene

A scene folder is only `index.html` and `scene.ts`. Markup and a storyboard of absolute millisecond timings. Compose primitives from `src/lib`. If you need a new behaviour, add it there with a comment that explains why it exists.

Colours and curves come from `src/styles/tokens.css` via `var()`. Nothing else.
