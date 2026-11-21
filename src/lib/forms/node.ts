import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { tokenColor } from '../world';

export type RunNode = {
  group: THREE.Group;
};

type Category = 'io' | 'ai' | 'utility' | 'logic' | 'output';

/**
 * The blocks the film shows, with the glyph each one draws on the canvas.
 * Labels, categories, and icon names are visual-registry.ts; the path data
 * is the IconNode* set in EdgazeIcons.tsx (20-unit viewBox).
 */
const BLOCKS = {
  // Ask for Input — io, ArrowRight
  input: {
    category: 'io',
    svg: '<rect x="4.5" y="5.5" width="11" height="9" rx="1.4"/><path d="M8.2 10h5.2M11.8 8.2 14 10l-2.2 1.8"/>',
  },
  // Generate Text — ai, MessageSquare
  text: {
    category: 'ai',
    svg: '<path d="M4.5 5.8h9.5c.88 0 1.6.72 1.6 1.6v4c0 .88-.72 1.6-1.6 1.6H9.2L6.5 15v-2.6H4.5c-.88 0-1.6-.72-1.6-1.6V7.4c0-.88.72-1.6 1.6-1.6Z"/><path d="M7.2 9h5.6"/>',
  },
  // Call an API — utility, Globe
  api: {
    category: 'utility',
    svg: '<circle cx="10" cy="10" r="5.5"/><path d="M4.5 10h11M10 4.5c2 1.65 2 9.35 0 11M10 4.5c-2 1.65-2 9.35 0 11"/>',
  },
  // Get Content — utility, ScanSearch
  content: {
    category: 'utility',
    svg: '<path d="M5.5 4.5h5.5L14 7.5v8c0 .83-.67 1.5-1.5 1.5H5.5c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5Z"/><path d="M11 4.5V7.8h3.2"/><circle cx="9.2" cy="11.2" r="2.4"/><path d="M10.9 12.9 13.2 15.2"/>',
  },
  // Decide — logic, GitBranch
  decide: {
    category: 'logic',
    svg: '<circle cx="6" cy="6.5" r="1.5"/><path d="M7.5 6.5H12.5M12.5 6.5v5.5"/><circle cx="12.5" cy="13.5" r="1.5"/><circle cx="15.5" cy="6.5" r="1.5"/>',
  },
  // Result — the workflow output, Output
  result: {
    category: 'output',
    svg: '<rect x="4.8" y="5.2" width="10.4" height="10.4" rx="2"/><path d="M7.4 10.1 9.2 11.9 12.8 8.1"/>',
  },
} as const satisfies Record<string, { category: Category; svg: string }>;

export type BlockKind = keyof typeof BLOCKS;

/** Why: a glyph traced as a polyline so the tube follows every corner. */
class Polyline extends THREE.Curve<THREE.Vector3> {
  private readonly lengths: number[] = [0];
  constructor(private readonly pts: THREE.Vector3[]) {
    super();
    for (let i = 1; i < pts.length; i += 1) {
      this.lengths.push(this.lengths[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    }
  }
  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const total = this.lengths.at(-1)!;
    const d = Math.min(1, Math.max(0, t)) * total;
    let i = 1;
    while (i < this.lengths.length - 1 && this.lengths[i]! < d) i += 1;
    const a = this.lengths[i - 1]!;
    const span = this.lengths[i]! - a || 1;
    return target.lerpVectors(this.pts[i - 1]!, this.pts[i]!, (d - a) / span);
  }
}

const loader = new SVGLoader();

/**
 * Why: the node face carries the block's own glyph, in the builder's own
 * stroke weight (1.15 on a 20-unit box) at the builder's own size (44% of
 * the face), so a node in the film is a node you could find on the canvas.
 * The strokes are tubes with round caps sitting just proud of the face.
 */
function glyph(kind: BlockKind, size: number, z: number, mat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const data = loader.parse(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">${BLOCKS[kind].svg}</svg>`,
  );
  const radius = (1.15 / 20) * size * 0.5;
  const cap = new THREE.SphereGeometry(radius, 12, 8);
  for (const shapePath of data.paths) {
    for (const sub of shapePath.subPaths) {
      const pts = sub
        .getPoints(48)
        .map((p) => new THREE.Vector3(((p.x - 10) / 20) * size, (-(p.y - 10) / 20) * size, z));
      const clean = pts.filter((p, i) => i === 0 || p.distanceTo(pts[i - 1]!) > 1e-4);
      if (clean.length < 2) continue;
      const closed = clean[0]!.distanceTo(clean.at(-1)!) < 1e-3;
      group.add(
        new THREE.Mesh(
          new THREE.TubeGeometry(new Polyline(clean), clean.length * 3, radius, 10, false),
          mat,
        ),
      );
      const ends = closed ? [clean[0]!] : [clean[0]!, clean.at(-1)!];
      // Joints get caps too, so a sharp corner stays round like the SVG's.
      for (const p of [...ends, ...clean.slice(1, -1).filter((_, i) => i % 6 === 0)]) {
        const m = new THREE.Mesh(cap, mat);
        m.position.copy(p);
        group.add(m);
      }
    }
  }
  return group;
}

/**
 * Why: every object in the film is an Edgaze workflow node — the premium
 * builder node made solid: the #191919 face with its 10px radius, the dark
 * input port on the left, the output port in the block's category colour
 * on the right, the status dot in the corner, and the block's glyph on the
 * face. `running` is the canvas's live state (border and dot in running
 * blue); `done` is a finished run (success dot, quiet border).
 *
 * Proportions follow the builder: a 143px face, 8px ports centred on the
 * sides, the dot at 8% of the face inset from the corner, the glyph at 44%.
 * One builder pixel is 0.063cm here, so a node is a 9cm palm-sized slab.
 */
export function makeNode(
  env: THREE.Texture,
  {
    kind = 'result',
    size = 1,
    lit = 1,
    state = 'done',
  }: {
    kind?: BlockKind;
    size?: number;
    lit?: number;
    state?: 'running' | 'done';
  } = {},
): RunNode {
  const running = state === 'running';
  const category = BLOCKS[kind].category;
  const iconColor = tokenColor(`--pn-icon-${category}`);
  const portColor = tokenColor(`--pn-port-${category}`);
  const status = tokenColor(running ? '--pn-running' : '--pn-success');

  const px = 0.063 * size;
  const face = 143 * px;
  const depth = 34 * px;
  const front = depth / 2;

  const body = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--node-face'),
    metalness: 0.2,
    roughness: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    envMap: env,
    envMapIntensity: 1.8,
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new RoundedBoxGeometry(face, face, depth, 6, 10 * px), body));

  // Ports: 8px squares with a 2px radius, half proud of each side.
  const port = new RoundedBoxGeometry(9 * px, 9 * px, 9 * px, 3, 2 * px);
  const input = new THREE.Mesh(
    port,
    new THREE.MeshPhysicalMaterial({
      color: tokenColor('--node-port-line'),
      metalness: 0.3,
      roughness: 0.4,
      envMap: env,
      envMapIntensity: 1,
    }),
  );
  input.position.set(-face / 2, 0, 0);
  const output = new THREE.Mesh(
    port,
    new THREE.MeshPhysicalMaterial({
      color: portColor,
      roughness: 0.35,
      emissive: portColor,
      emissiveIntensity: 0.4 * lit,
      envMap: env,
      envMapIntensity: 0.8,
    }),
  );
  output.position.set(face / 2, 0, 0);
  group.add(input, output);

  // Status dot: 8% of the face, ringed in the dot-ring grey.
  const dotR = face * 0.04;
  const inset = 9 * px + dotR;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(dotR, 0.9 * px, 12, 48),
    new THREE.MeshStandardMaterial({ color: tokenColor('--node-dot-ring'), roughness: 0.5 }),
  );
  const dot = new THREE.Mesh(
    new THREE.CylinderGeometry(dotR * 0.92, dotR * 0.92, 1.4 * px, 40),
    new THREE.MeshStandardMaterial({
      color: status,
      emissive: status,
      emissiveIntensity: 1.8 * lit,
    }),
  );
  dot.rotation.x = Math.PI / 2;
  for (const m of [ring, dot]) {
    m.position.set(face / 2 - inset, face / 2 - inset, front + 0.3 * px);
  }
  group.add(ring, dot);

  // The block's glyph, in its category's icon colour.
  group.add(
    glyph(
      kind,
      face * 0.44,
      front + 1.2 * px,
      new THREE.MeshStandardMaterial({
        color: iconColor,
        emissive: iconColor,
        emissiveIntensity: 0.7 * lit,
        roughness: 0.45,
      }),
    ),
  );

  if (running) {
    // A running node's 1px border turns running blue: a hairline round the
    // face's own rounded outline.
    const half = face / 2 - 0.6 * px;
    const radius = 10 * px;
    const outline = new THREE.Shape();
    outline.moveTo(-half + radius, -half);
    outline.lineTo(half - radius, -half);
    outline.absarc(half - radius, -half + radius, radius, -Math.PI / 2, 0, false);
    outline.lineTo(half, half - radius);
    outline.absarc(half - radius, half - radius, radius, 0, Math.PI / 2, false);
    outline.lineTo(-half + radius, half);
    outline.absarc(-half + radius, half - radius, radius, Math.PI / 2, Math.PI, false);
    outline.lineTo(-half, -half + radius);
    outline.absarc(-half + radius, -half + radius, radius, Math.PI, Math.PI * 1.5, false);
    const loop = new THREE.CatmullRomCurve3(
      outline.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, p.y, front + 0.2 * px)),
      true,
    );
    group.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(loop, 320, 0.9 * px, 8, true),
        new THREE.MeshStandardMaterial({
          color: status,
          emissive: status,
          emissiveIntensity: 1.1 * lit,
        }),
      ),
    );
  }

  return { group };
}
