import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { seeded } from '../curve';
import { tokenColor } from '../world';
import { makeNode, type BlockKind, type RunNode } from './node';

/**
 * Why: containment is sold by the glass, not by a label. Six thick slabs
 * with rounded edges, each a real transmission volume, so the objects
 * behind a wall shift as the camera moves round — the refraction is what
 * tells you there is a wall there at all. Slabs meet at butt joints rather
 * than overlapping, so no two faces are ever coplanar and nothing shimmers.
 */
export function makeGlassCube(env: THREE.Texture, size = 48, wall = 2.4): THREE.Group {
  const glass = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--pr-sandbox'),
    transmission: 0.965,
    roughness: 0.22,
    metalness: 0,
    thickness: wall * 1.6,
    ior: 1.5,
    specularIntensity: 1,
    envMap: env,
    envMapIntensity: 1.8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
  });
  const half = size / 2;
  const inner = size - wall * 2;
  const r = 0.55;
  const face = new RoundedBoxGeometry(size, size, wall, 4, r);
  const side = new RoundedBoxGeometry(wall, size, inner, 4, r);
  const lid = new RoundedBoxGeometry(inner, wall, inner, 4, r);
  const cube = new THREE.Group();
  const put = (geo: THREE.BufferGeometry, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, glass);
    m.position.set(x, y, z);
    cube.add(m);
  };
  put(face, 0, 0, half - wall / 2);
  put(face, 0, 0, -half + wall / 2);
  put(side, half - wall / 2, 0, 0);
  put(side, -half + wall / 2, 0, 0);
  put(lid, 0, half - wall / 2, 0);
  put(lid, 0, -half + wall / 2, 0);
  return cube;
}

/**
 * Why: a label on glass reads as a sticker unless it behaves like the glass.
 * This is a sandblasted etch: the Edgaze mark as a single-tone silhouette
 * (derived from the mark's own brightness, so the eye stays clear glass)
 * and the word beside it, in one frosted grey, laid a hair above the lid.
 * It is matte where the lid is glossy, lit by the same key, and only
 * partly opaque, so the lid's reflections still run across it.
 *
 * The canvas is drawn once from a mark and a font that are both loaded
 * before the scene starts, so every render gets the same etch.
 */
export function makeEtch(
  mark: HTMLImageElement,
  { word = 'Sandbox', width = 38 }: { word?: string; width?: number } = {},
): THREE.Mesh {
  const W = 2048;
  const H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context for the etch');

  // The mark as a silhouette: brightness above the black ground becomes
  // coverage, so the cube's faces are etched and its gaps and eye are not.
  const markH = 300;
  const markW = Math.round((mark.naturalWidth / mark.naturalHeight) * markH);
  const tile = document.createElement('canvas');
  tile.width = markW;
  tile.height = markH;
  const tctx = tile.getContext('2d');
  if (!tctx) throw new Error('No 2D context for the etch mark');
  tctx.drawImage(mark, 0, 0, markW, markH);
  const px = tctx.getImageData(0, 0, markW, markH);
  for (let i = 0; i < px.data.length; i += 4) {
    const lum =
      (px.data[i]! * 0.2126 + px.data[i + 1]! * 0.7152 + px.data[i + 2]! * 0.0722) / 255;
    const cover = Math.min(1, Math.max(0, (lum - 0.1) / 0.18));
    px.data[i] = 255;
    px.data[i + 1] = 255;
    px.data[i + 2] = 255;
    px.data[i + 3] = Math.round(cover * (px.data[i + 3]! / 255) * 255);
  }
  tctx.putImageData(px, 0, 0);

  const font = `600 232px Inter, "SF Pro Display", sans-serif`;
  ctx.font = font;
  const gap = 64;
  const textW = ctx.measureText(word).width;
  const total = markW + gap + textW;
  const x0 = (W - total) / 2;
  ctx.drawImage(tile, x0, (H - markH) / 2 - 6);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--white');
  ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.letterSpacing = '-4px';
  ctx.fillText(word, x0 + markW + gap, H / 2 + 8);

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * H) / W),
    new THREE.MeshStandardMaterial({
      color: tokenColor('--pr-etch'),
      map,
      transparent: true,
      opacity: 0.85,
      roughness: 0.82,
      metalness: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  // Flat on the lid, reading left to right from the orbiting camera.
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export type Tenants = {
  group: THREE.Group;
  nodes: RunNode[];
  /** Pose every tenant for beat-local time `t` in seconds. */
  pose: (t: number) => void;
};

/**
 * Why: the nodes inside — workflows running in isolation — have to keep moving and keep meeting each other,
 * and they must visibly never reach the glass. That is a small simulation —
 * wander, soft wall avoidance, soft mutual repulsion — but a live sim would
 * give a different sandbox on every scrub. It is integrated once, at build,
 * on a fixed 240Hz step from a seed, and the beat just reads it back.
 */
export function makeTenants(
  env: THREE.Texture,
  {
    count = 4,
    seed = 9_028,
    bound = 15.5,
    seconds = 7,
    size = 0.9,
  }: { count?: number; seed?: number; bound?: number; seconds?: number; size?: number } = {},
): Tenants {
  const next = seeded(seed);
  const hz = 240;
  const steps = Math.ceil(seconds * hz) + 1;
  const pos = Array.from({ length: count }, () => new Float32Array(steps * 3));
  const spin = Array.from({ length: count }, () => new Float32Array(steps * 3));

  const p = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + next() * 0.6;
    return new THREE.Vector3(Math.cos(a) * 9, (next() - 0.5) * 12, Math.sin(a) * 9);
  });
  const v = p.map(() =>
    new THREE.Vector3(next() - 0.5, next() - 0.5, next() - 0.5).normalize().multiplyScalar(7),
  );
  const w = p.map(() =>
    new THREE.Vector3(next() - 0.5, next() - 0.5, next() - 0.5).multiplyScalar(0.5),
  );
  const ph = p.map(() => [next() * 6.28, next() * 6.28, next() * 6.28] as const);
  const rot = p.map(() => new THREE.Vector3(next() * 6.28, next() * 6.28, next() * 6.28));
  const f = new THREE.Vector3();
  const d = new THREE.Vector3();
  const dt = 1 / hz;
  const cruise = 7.5;

  for (let s = 0; s < steps; s += 1) {
    const t = s * dt;
    for (let i = 0; i < count; i += 1) {
      pos[i]!.set([p[i]!.x, p[i]!.y, p[i]!.z], s * 3);
      spin[i]!.set([rot[i]!.x, rot[i]!.y, rot[i]!.z], s * 3);
    }
    for (let i = 0; i < count; i += 1) {
      const pi = p[i]!;
      const [a, b, c] = ph[i]!;
      // Wander: a slowly turning intention, never a target to arrive at.
      f.set(
        Math.sin(t * 0.7 + a),
        Math.sin(t * 0.53 + b) * 0.7,
        Math.cos(t * 0.61 + c),
      ).multiplyScalar(5);
      // The glass: a soft field that turns them back before they touch it.
      for (const axis of ['x', 'y', 'z'] as const) {
        const over = Math.abs(pi[axis]) - (bound - 5);
        if (over > 0) f[axis] -= Math.sign(pi[axis]) * over * over * 3.2;
      }
      // Each other: close enough to interact, never close enough to touch.
      for (let j = 0; j < count; j += 1) {
        if (j === i) continue;
        d.subVectors(pi, p[j]!);
        const dist = d.length();
        if (dist < 12 && dist > 1e-3) f.addScaledVector(d.normalize(), (12 - dist) * 4.2);
      }
      const vi = v[i]!;
      vi.addScaledVector(f, dt);
      const speed = vi.length();
      vi.multiplyScalar(1 + (cruise / Math.max(speed, 1e-3) - 1) * 0.02);
      pi.addScaledVector(vi, dt);
      for (const axis of ['x', 'y', 'z'] as const) {
        pi[axis] = Math.max(-bound, Math.min(bound, pi[axis]));
      }
      rot[i]!.addScaledVector(w[i]!, dt);
    }
  }

  const group = new THREE.Group();
  // Four different blocks of one workflow, all live: input, model, API
  // call, branch — a whole run's worth of activity, none of it leaving.
  const kinds: BlockKind[] = ['input', 'text', 'api', 'decide'];
  const nodes = p.map((_, i) => {
    const node = makeNode(env, {
      kind: kinds[i % kinds.length],
      size,
      lit: 1.8,
      state: 'running',
    });
    group.add(node.group);
    return node;
  });

  const pose = (t: number) => {
    const x = Math.max(0, Math.min(steps - 1.001, t * hz));
    const s = Math.floor(x);
    const k = x - s;
    nodes.forEach((node, i) => {
      const P = pos[i]!;
      const R = spin[i]!;
      const at = (arr: Float32Array, o: number) =>
        arr[s * 3 + o]! * (1 - k) + arr[(s + 1) * 3 + o]! * k;
      node.group.position.set(at(P, 0), at(P, 1), at(P, 2));
      // Sway, don't tumble: a node seen edge-on is a slab, not a workflow.
      node.group.rotation.set(
        0.3 * Math.sin(at(R, 0)),
        0.55 * Math.sin(at(R, 1)),
        0.2 * Math.sin(at(R, 2)),
      );
    });
  };

  return { group, nodes, pose };
}
