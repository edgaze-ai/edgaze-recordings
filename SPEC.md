# edgaze-motion / build spec

Drop this at the repo root as `SPEC.md`, then in Cursor Agent mode:

> Read SPEC.md and scaffold the entire repo exactly as specified. Create every file. Do not skip the `.cursor/rules` files or AGENTS.md. When done, run `npm install && npm run typecheck && npm run build` and fix anything that fails.

---

## 1. What this repo is

A motion system for Edgaze product clips. Scenes are authored as standalone web pages at true pixel size, previewed in a browser, and screen-recorded. The point is that scene #12 costs twenty minutes instead of four hours, because the craft is in the library and the rules, not in each file.

Not a component library. Not a website. Every page here exists to be recorded and thrown away.

## 2. Craft laws (non-negotiable)

These are the difference between premium and templated. Any generated scene that violates one is wrong.

1. **House curve is `cubic-bezier(.16,1,.3,1)`.** Never `ease`, `ease-in-out`, or `linear` on anything except a camera push.
2. **Nothing arrives simultaneously.** Minimum 55ms stagger between sibling elements. A stagger of 0 is a bug.
3. **Clip, don't fade.** Text reveals from an `overflow:hidden` mask with an inner `translateY(115%)`. Opacity-only entrances are banned. Where opacity is used, it is always paired with a transform.
4. **Fast-moving objects get a ghost trail.** 6 to 10 copies, 18 to 26ms apart, falling opacity. This is fake motion blur and it is the single largest quality gap between web motion and After Effects. Never "clean it up" by reducing the count.
5. **Every scene has a camera push.** Whole composition scales 1.0 to ~1.032 over the full duration, linear. Without it the frame reads as a slide.
6. **Shadows are layered.** Three per object at increasing blur and falling opacity. Never one.
7. **Display type is tracked negative.** `-0.035em` or tighter above 80px. Inter weight 600, not 700.
8. **Only `transform` and `opacity` animate.** Never width, height, top, left, or margin. Everything stays on the compositor so the capture holds 60fps.

Plus one hard rule specific to the brand:

9. **A gradient phrase reveals as ONE masked unit, never per word.** Splitting gradient text per word restarts the cyan-to-pink ramp inside every word. It looks broken. Plain text staggers per word; gradient text is whole.

## 3. Tree

```
edgaze-motion/
├── AGENTS.md
├── SPEC.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── .gitattributes
├── .cursor/
│   └── rules/
│       ├── motion-craft.mdc
│       ├── scene-authoring.mdc
│       └── brand-tokens.mdc
├── scripts/
│   └── new-scene.mjs
├── recordings/          # gitignored, see §8
│   └── .gitkeep
└── src/
    ├── index.html       # gallery, links every scene
    ├── styles/
    │   ├── tokens.css   # brand + motion tokens, single source of truth
    │   └── stage.css    # stage, mask primitive, grain, bloom, pulse
    ├── lib/
    │   ├── index.ts     # barrel
    │   ├── timeline.ts
    │   ├── reveal.ts
    │   ├── trail.ts
    │   ├── camera.ts
    │   ├── counter.ts
    │   └── stage.ts
    └── scenes/
        ├── _template/
        │   ├── index.html
        │   └── scene.ts
        └── 001-run-lifecycle/
            ├── index.html
            └── scene.ts
```

## 4. Stack

- **Vite + TypeScript, multi-page.** Not Next, not a framework. Each scene is its own HTML entry.
- **No animation library.** Web Animations API only. GSAP is fine to add later but the primitives here are 200 lines and adding a dependency hides the craft values behind an API.
- **Relative imports only.** No `@` or `~` aliases anywhere.
- `vite.config.ts` reads `src/scenes/*` at config time with `readdirSync` and generates one rollup input per folder. Adding a scene folder must require zero config changes.
- The gallery at `src/index.html` uses `import.meta.glob('./scenes/*/scene.ts')` to list scenes automatically.

## 5. Token contract

`src/styles/tokens.css` is the only place a colour or a curve is ever written. Scenes reference `var(--x)` and nothing else.

```css
:root {
  /* brand */
  --black: #000000;
  --white: #FFFFFF;
  --muted: #7C879B;
  --line: rgba(255,255,255,.10);
  --cyan: #22D9F0;
  --pink: #F653C8;
  --brand: linear-gradient(100deg, var(--cyan) 0%, var(--pink) 100%);

  /* type */
  --ui: 'Inter', -apple-system, ui-sans-serif, system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, monospace;

  /* motion */
  --expo: cubic-bezier(.16,1,.3,1);
  --quint: cubic-bezier(.22,1,.36,1);
  --travel: cubic-bezier(.5,0,.5,1);

  /* preview only, never affects export */
  --zoom: .5;
}
```

`stage.css` must include:

- `.stage` at true pixel size, `overflow:hidden`, `transform: scale(var(--zoom))`, `transform-origin: top left`
- `.stage::after` radial vignette
- `.grain` overlay at **5.5% opacity, `mix-blend-mode: screen`**. This is not texture. Large soft cyan and pink blooms over pure black band badly under H.264, and LinkedIn re-encodes on top of that. The grain dithers the ramp. Do not remove it or lower it.
- `.m` / `.m > i` mask primitive with `padding-bottom:.18em; margin-bottom:-.18em` so descenders are not clipped
- `.grad` using `background: var(--brand); -webkit-background-clip: text; color: transparent`
- `.bloom.c` and `.bloom.p` radial gradient blooms
- `.pulse` for trail ghosts, with `offset-rotate: 0deg`
- `body.rec` state that hides all page chrome and sets a black page
- `@media (prefers-reduced-motion: reduce)` that lands everything in its final state

Load Inter from Google Fonts at weights 400/500/600/700.

## 6. Library contract

Implement exactly these signatures. Each one carries a doc comment explaining *why*, not what, because those comments are what keeps future generated scenes on-style.

```ts
// timeline.ts
export const ease: { expo: string; quint: string; travel: string; linear: string };
export class Timeline {
  constructor(rate?: number);
  rate: number;
  add(el: Element, frames: Keyframe[], opts?: KeyframeAnimationOptions): Animation;
  at(ms: number, fn: () => void): void;      // absolute scene time, respects rate
  raf(fn: (t: number) => boolean): void;      // return false to stop
  clear(): void;
}

// reveal.ts
export function prepare(root: ParentNode): void;
//   Wraps [data-split] elements into .m > i masks.
//   data-split          -> one mask per word
//   data-split="whole"  -> one mask for the whole phrase (USE FOR GRADIENT TEXT)
export function units(scope: ParentNode): HTMLElement[];
export function reveal(tl, els, { at, step?, duration?, easing? }): void;   // step default 60
export function wipeX(tl, el, { at, duration? }): void;
export function popIn(tl, els, { at, step?, duration?, base? }): void;      // step default 130

// trail.ts
export function ghostTrail(tl, {
  host, d, at, duration, count?, gap?, from?, to?, size?
}): void;   // count default 8, gap default 22
export function drawPath(tl, path: SVGPathElement, { at, duration }): void;
//   Sync drawPath and ghostTrail to the same `at` and `duration` so the pulse
//   appears to paint the wire in behind itself.

// camera.ts
export function cameraPush(tl, el, { duration, from?, to? }): void;  // to default 1.032
export function drift(tl, el, { duration, dx, dy }): void;

// counter.ts
export function countUp(tl, el, { to, at, duration?, decimals?, prefix?, suffix? }): void;
//   Uses quartOut. A linear counter is the tell that the number was bolted on.

// stage.ts
export function mountStage(config: {
  width: number; height: number; duration: number;
  build: (tl: Timeline, stage: HTMLElement) => void;
  still?: (stage: HTMLElement) => void;
}): void;
```

`mountStage` responsibilities:

- set `.stage` to true width/height, scale to fit the viewport for preview
- wire `#replay`, `#slow` (0.25x toggle), `#rec` buttons and Escape to exit record view
- loop the scene every `duration + 700ms`
- call `prepare()` before the first build
- honour `prefers-reduced-motion` by calling `still()` and skipping all animation

**Record zoom logic.** A MacBook display is narrower than 1920 logical px, so a 16:9 stage never fits at 1:1. It does not need to. Retina captures at 2x, so any zoom at or above `1 / devicePixelRatio` still yields at least `width` real pixels, and anything above that is supersampled. Record view should pick `max(1/dpr, min(1, fitScale))`.

## 7. Scene contract

Every scene folder contains exactly `index.html` and `scene.ts`.

`index.html` holds only markup and the three chrome buttons. Zero inline styles, zero inline script beyond `<script type="module" src="./scene.ts">`.

`scene.ts` reads top to bottom as a storyboard with absolute millisecond timings:

```ts
import { mountStage, units, reveal, wipeX, popIn, ghostTrail, drawPath,
         cameraPush, drift, countUp } from '../../lib/index';

mountStage({
  width: 1920,
  height: 1080,
  duration: 10000,
  build(tl, stage) {
    cameraPush(tl, stage.querySelector('.camera')!, { duration: 10000 });
    drift(tl, stage.querySelector('.bloom.c')!, { duration: 10000, dx: 80,  dy: 50  });
    drift(tl, stage.querySelector('.bloom.p')!, { duration: 10000, dx: -70, dy: -45 });

    reveal(tl, units(stage.querySelector('.eyebrow')!), { at: 200 });
    reveal(tl, units(stage.querySelector('h1')!),       { at: 400, step: 60 });
    wipeX(tl, stage.querySelector('.rule')!,            { at: 1050 });
    // ...
  },
  still(stage) { /* final resting state for reduced motion */ },
});
```

`scripts/new-scene.mjs` copies `_template` to `src/scenes/<nnn>-<slug>/` and does nothing else. `npm run new 002 pricing-model`.

**Scene 001 to build now: `001-run-lifecycle`, 1920x1080, 10s.** Left column is eyebrow, headline with a gradient-highlighted second line, gradient rule, and two counters. Right column is a three-node vertical S-curve graph labelled trigger / execute / settle. The pulse travels the curve shifting cyan to pink while `drawPath` paints the gradient stroke in behind it, and each node lights as the pulse reaches it. Trigger and execute glow cyan, settle glows pink, so the palette carries state instead of just sitting there looking branded.

## 8. Recordings: do not commit them

The premise "a repo containing all our recordings" needs one correction before you build it.

Git stores every version of every binary forever. A 20MB clip re-exported eight times is 160MB in history permanently, and `git clone` never gets faster again. Ten scenes in and the repo is unusable.

Default in this spec: `recordings/` is gitignored. The repo versions the **sources**, which are text and diff cleanly, and any clip can be regenerated from them in thirty seconds.

`.gitattributes` ships with LFS rules commented out. Uncomment only if you have decided you specifically need versioned video and have run `git lfs install`. Note that GitHub's free LFS quota is small and overage is billed, so check the current limits before switching it on.

If you want a browsable archive of finished clips, put them somewhere built for binaries (Azure Blob, an R2 bucket, or a GitHub Release attached to a tag) and keep a `recordings/INDEX.md` in git listing scene, date, dimensions and link.

## 9. Files to create verbatim

### `.cursor/rules/motion-craft.mdc`

```
---
description: Non-negotiable motion craft rules for all animation work in this repo
alwaysApply: true
---

Animation in this repo follows nine laws. Violating one is a bug, not a style choice.

1. House easing curve is cubic-bezier(.16,1,.3,1). Never ease, ease-in-out, or
   linear, except linear on a camera push.
2. Sibling elements never animate simultaneously. Minimum 55ms stagger.
3. Text reveals by clipping (overflow:hidden mask + inner translateY(115%)),
   never by fading. Opacity is always paired with a transform.
4. Fast-moving objects get a ghost trail of 6 to 10 copies, 18 to 26ms apart,
   falling opacity. This is fake motion blur. Never reduce the count.
5. Every scene has a camera push: scale 1.0 to ~1.032 over the full duration.
6. Shadows are three layers at increasing blur and falling opacity, never one.
7. Display type above 80px is tracked -0.035em or tighter. Inter 600, not 700.
8. Animate transform and opacity only. Never width, height, top, left, margin.
9. A gradient phrase reveals as ONE masked unit. Splitting gradient text per
   word restarts the colour ramp inside each word and looks broken.

All colours and curves come from src/styles/tokens.css via var(). Never write a
hex value or a bezier literal inside a scene.
```

### `.cursor/rules/scene-authoring.mdc`

```
---
description: How to author a scene in src/scenes
globs: src/scenes/**
alwaysApply: false
---

A scene folder contains exactly index.html and scene.ts.

index.html is markup only: a .stage at true pixel size, the bloom layers, a
.camera wrapper holding all content, a .grain overlay, and the three chrome
buttons (#replay, #slow, #rec). No inline styles. No inline script beyond
<script type="module" src="./scene.ts">.

scene.ts calls mountStage once and reads top to bottom as a storyboard using
absolute millisecond timings. Do not nest callbacks. Do not use setTimeout
directly; use tl.at().

Compose from src/lib primitives. If a scene needs a motion behaviour that does
not exist yet, add it to src/lib as a named primitive with a doc comment
explaining why it exists, then use it. Never inline a one-off animation.

Text that should stagger per word gets data-split. Text that must stay one unit,
which means anything using the .grad class, gets data-split="whole".

Typical timings for a 10s scene: eyebrow 200, headline 400 with step 60, rule
1050, objects 1300 with step 140, the travelling pulse 2500 over 2800, counters
and footer 3800.

Imports are relative. No @ or ~ aliases.
```

### `.cursor/rules/brand-tokens.mdc`

```
---
description: Edgaze brand tokens and where colour is allowed to live
globs: src/styles/**
alwaysApply: false
---

Brand is pure black ground with cyan and pink gradients, Inter throughout.
--cyan #22D9F0, --pink #F653C8, --brand is a 100deg linear-gradient between them.

Highlighted text uses .grad: background var(--brand), background-clip text,
color transparent.

tokens.css is the single source of truth. If a scene needs a colour, add a token
here rather than writing a literal in the scene.

The .grain overlay at 5.5% opacity with mix-blend-mode screen is functional, not
decorative. Large soft gradients over pure black band under H.264 and the export
gets re-encoded again on upload. The grain dithers the ramp. Do not remove it or
lower the opacity.
```

### `AGENTS.md`

```markdown
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
```

## 10. Acceptance checks

Cursor is done when all of these pass:

- [ ] `npm install && npm run typecheck && npm run build` all succeed
- [ ] `npm run dev`, gallery lists both scenes, both links open and animate
- [ ] `npm run new 002 test-scene` creates a working scene with no config edit
- [ ] Scene 001 record view shows a clean black frame, no chrome, correct aspect
- [ ] Escape exits record view
- [ ] Slow motion at 0.25x makes the ghost trail visibly separate into copies
- [ ] `grep -rn "ease-in-out\|#22D9F0\|cubic-bezier" src/scenes/` returns nothing
- [ ] Emulating `prefers-reduced-motion: reduce` shows the final frame, no motion
- [ ] `git status` shows nothing under `recordings/` after a test export

---

## Working with it after scaffold

Once the repo exists, new clips are one prompt:

> `npm run new 003 mcp-server`. Build a 1920x1080 10s scene announcing the Edgaze MCP server. Four tool nodes arranged in a row, each revealing with its name, then a pulse connecting them left to right. Follow the scene contract and the craft rules.

Cursor loads `motion-craft.mdc` automatically because it is `alwaysApply`, and `scene-authoring.mdc` auto-attaches because the file path matches the glob. That is the whole reason to put craft in rule files rather than in your head: the constraints travel with the repo and survive you forgetting them at 3am.
