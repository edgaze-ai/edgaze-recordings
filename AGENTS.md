# edgaze-motion

Motion system for Edgaze product clips. Scenes are standalone web pages authored
at true pixel size, previewed in a browser, and screen-recorded.

## Commands
- `npm run dev` - dashboard at /. Export MP4 / MOV from a scene row
- `npm run new 00X slug` - scaffold a new scene from _template
- `npm run beats -- music/<name>` - beat map for a track (or an exported clip):
  writes `<name>.beats.json` + `<name>.beats.md`. Read the .md before storyboarding.
- `npm run typecheck` - tsc --noEmit
- `npm run build` - production build to dist/

## Architecture
- `src/styles/tokens.css` - every colour and curve. Single source of truth.
- `src/lib/*` - motion primitives. Small, documented, composed by scenes.
- `src/assets/{photos,videos,gifs}/` - drop-in plates. Scenes use data-asset.
- `src/scenes/<nnn>-<slug>/` - one clip each. index.html + scene.ts.
- `src/lib/beatgrid.ts` - beat detection + `barAt`/`snap`. Scenes cut to a
  BeatMap, never to guessed ms. `src/lib/score.ts` - the soundtrack as cues.
- `src/styles/launch.css` - the default look: light ground, huge black type,
  colour wipes, category fields. Dark (`data-tone="dark"`) is opt-in.
- `src/assets/music/` - licensed tracks (gitignored); beat maps stay in git.
- `vite.config.ts` reads scene folders at config time. Adding a scene needs no
  config change.

## Code style
- TypeScript strict. Relative imports only, no @ or ~ aliases.
- No animation library. Web Animations API via the Timeline class.
- Scenes compose primitives. A one-off inline animation in a scene is a smell;
  promote it to src/lib instead.

## Launch films (default from 010)
- Light ground, `.kin` display type at 130–320px, Inter Tight 600, tight tracking.
- Change picture with `colorWipe({ cover: B(bar) })` so the frame is covered
  exactly on a downbeat. Words `slam` to land on beats (start ~70ms early).
- Every scene has `score(s)` written against the same beat map: whoosh peaks on
  wipe covers, impacts on drops, hits on slams. Preview plays it; export muxes it.
- To check sync after export: `npm run beats -- recordings/<clip>.mp4` and compare.
- Export is 2× the stage at 60fps: 3840×2160 for 16:9 scenes, 2160×3840 for
  vertical (Reels/Shorts) scenes like 011, whose mountStage uses width 1080, height 1920. MP4 = H.264 CRF16 + AAC 320k (delivery);
  MOV = ProRes 422 HQ + PCM (master, large).

## Constraints
- Never animate anything but transform and opacity.
- Never write a hex value or a bezier literal outside tokens.css.
- recordings/ is gitignored. Do not commit video. See SPEC.md section 8.
- Full craft rules are in .cursor/rules/motion-craft.mdc.
