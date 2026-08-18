# edgaze-motion

Motion system for Edgaze product clips. Scenes are standalone web pages authored
at true pixel size, previewed in a browser, and screen-recorded.

## Commands
- `npm run dev` - dev server with HMR, open the gallery at /
- `npm run new 00X slug` - scaffold a new scene from _template
- `npm run typecheck` - tsc --noEmit
- `npm run build` - production build to dist/

## Architecture
- `src/styles/tokens.css` - every colour and curve. Single source of truth.
- `src/lib/*` - motion primitives. Small, documented, composed by scenes.
- `src/scenes/<nnn>-<slug>/` - one clip each. index.html + scene.ts.
- `vite.config.ts` reads scene folders at config time. Adding a scene needs no
  config change.

## Code style
- TypeScript strict. Relative imports only, no @ or ~ aliases.
- No animation library. Web Animations API via the Timeline class.
- Scenes compose primitives. A one-off inline animation in a scene is a smell;
  promote it to src/lib instead.

## Constraints
- Never animate anything but transform and opacity.
- Never write a hex value or a bezier literal outside tokens.css.
- recordings/ is gitignored. Do not commit video. See SPEC.md section 8.
- Full craft rules are in .cursor/rules/motion-craft.mdc.
