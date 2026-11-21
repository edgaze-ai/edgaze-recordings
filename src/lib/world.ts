import * as THREE from 'three';
import { Timeline } from './timeline';

/**
 * Why: a WebGL material cannot take var(). Reading the token at build time
 * keeps tokens.css the only place a colour is written, even for light.
 */
export function tokenColor(name: `--${string}`): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return raw ? new THREE.Color(raw) : new THREE.Color(1, 1, 1);
}

let shared: THREE.WebGLRenderer | null = null;

/**
 * Why: mountStage rebuilds the stage from a snapshot on every loop and every
 * backwards scrub. A renderer created inside build() would leak one GL
 * context per rebuild until Chrome starts dropping them. There is one
 * renderer for the life of the page; each build re-parents its canvas.
 *
 * preserveDrawingBuffer is on because export screenshots the page after the
 * seek resolves, not inside the frame that drew it.
 */
export function worldRenderer(width: number, height: number): THREE.WebGLRenderer {
  if (!shared) {
    shared = new THREE.WebGLRenderer({
      antialias: true,
      // Transparent, so a DOM layer (the aurora) can sit behind the 3D.
      // The screen the canvas lives on is black, so an empty frame still is.
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    shared.setClearColor(tokenColor('--black'), 0);
    shared.outputColorSpace = THREE.SRGBColorSpace;
    shared.toneMapping = THREE.ACESFilmicToneMapping;
    shared.toneMappingExposure = 1;
    shared.domElement.className = 'world-canvas';
  }
  shared.setSize(width, height, false);
  return shared;
}

/**
 * Why: the export captures the 1080p stage at 2×, so the drawing buffer must
 * be 2× too or every 3D edge is an upscale. Preview only needs as many
 * pixels as the zoomed stage shows, which keeps scrubbing at 60fps.
 */
function pixelRatio(): number {
  const dpr = window.devicePixelRatio || 1;
  if (new URLSearchParams(location.search).get('export') === '1') return Math.max(2, dpr);
  const zoom =
    Number(getComputedStyle(document.documentElement).getPropertyValue('--zoom')) || 1;
  return Math.min(2, Math.max(1, dpr * zoom));
}

/**
 * Why: 3D has to live on the storyboard clock like everything else. The
 * world is drawn from absolute scene time on every seek, so play, scrub,
 * 0.25×, and the 60fps export all see the same frame for the same
 * millisecond. Nothing in the world keeps its own state between frames.
 */
export function mountWorld(
  tl: Timeline,
  host: HTMLElement,
  {
    width = 1920,
    height = 1080,
    draw,
  }: {
    width?: number;
    height?: number;
    draw: (renderer: THREE.WebGLRenderer, t: number) => void;
  },
): THREE.WebGLRenderer {
  const renderer = worldRenderer(width, height);
  const pr = pixelRatio();
  if (renderer.getPixelRatio() !== pr) {
    renderer.setPixelRatio(pr);
    renderer.setSize(width, height, false);
  }
  host.replaceChildren(renderer.domElement);
  tl.raf((t) => {
    draw(renderer, t);
    return true;
  });
  return renderer;
}
