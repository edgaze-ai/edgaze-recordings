import * as THREE from 'three';
import { seeded } from '../curve';

/**
 * Why: the token stream is volume without destination. Every grain is an
 * instance of one capsule, so thousands cost one draw call. Position is a
 * pure function of time — base + speed·t, then wrapped into a window that
 * travels with the camera — so the stream has no front and no end in any
 * frame, and scrubbing to any millisecond lands on the same river.
 *
 * Turbulence is three detuned sines per axis with per-grain phase. It never
 * organises into a shape and never settles, which is the point.
 */
export class TokenStream {
  readonly mesh: THREE.InstancedMesh;
  private readonly base: Float32Array;
  private readonly lane: Float32Array;
  private readonly depth: Float32Array;
  private readonly pace: Float32Array;
  private readonly phase: Float32Array;
  private readonly tilt: Float32Array;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3(1, 1, 1);

  constructor(
    material: THREE.Material,
    readonly opts: {
      count: number;
      seed: number;
      /** Length of the wrap window along x, in cm. Must exceed the frustum. */
      length: number;
      /** Half-height and half-depth of the river's cross-section, in cm. */
      halfY: number;
      halfZ: number;
      /** Mean grain speed along +x, in cm/s. */
      speed: number;
      /**
       * A throat the river is drawn through: grains converge on (x, 0, 0),
       * vanish inside `hide` of it, and fan back out beyond it. This is how
       * the stream feeds a node's input port and leaves by its output.
       */
      throat?: { x: number; hide: number; reach: number };
    },
  ) {
    // A grain of rice: ~6mm long, ~2mm thick. The capsule is built along y,
    // so it is laid along x once here and every instance flows lengthwise.
    const geo = new THREE.CapsuleGeometry(0.1, 0.42, 4, 10);
    geo.rotateZ(Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, material, opts.count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const n = opts.count;
    this.base = new Float32Array(n);
    this.lane = new Float32Array(n);
    this.depth = new Float32Array(n);
    this.pace = new Float32Array(n);
    this.phase = new Float32Array(n * 3);
    this.tilt = new Float32Array(n * 3);
    const next = seeded(opts.seed);
    // Denser in the middle of the river, thinner at its banks.
    const soft = () => (next() + next() + next()) / 1.5 - 1;
    for (let i = 0; i < n; i += 1) {
      this.base[i] = next() * opts.length;
      this.lane[i] = soft() * opts.halfY;
      this.depth[i] = soft() * opts.halfZ;
      this.pace[i] = 0.9 + next() * 0.2;
      for (let k = 0; k < 3; k += 1) {
        this.phase[i * 3 + k] = next() * Math.PI * 2;
        this.tilt[i * 3 + k] = (next() - 0.5) * 2;
      }
    }
  }

  /**
   * Lay every grain out for scene time `t` (seconds), with the wrap window
   * centred on `anchorX` — the x the camera is looking at.
   */
  update(t: number, anchorX: number): void {
    const { length, speed } = this.opts;
    const half = length / 2;
    for (let i = 0; i < this.opts.count; i += 1) {
      const a = this.phase[i * 3]!;
      const b = this.phase[i * 3 + 1]!;
      const c = this.phase[i * 3 + 2]!;
      const x = this.base[i]! + speed * this.pace[i]! * t;
      const rel = ((((x - anchorX + half) % length) + length) % length) - half;
      const y =
        this.lane[i]! +
        0.9 * Math.sin(t * 1.7 + a + x * 0.031) +
        0.45 * Math.sin(t * 3.1 + b) +
        0.22 * Math.sin(t * 5.3 + c + x * 0.07);
      const z =
        this.depth[i]! + 1.1 * Math.sin(t * 1.3 + b + x * 0.024) + 0.5 * Math.sin(t * 2.7 + c);
      const wx = anchorX + rel;
      let k = 1;
      let size = 1;
      const throat = this.opts.throat;
      if (throat) {
        const d = Math.abs(wx - throat.x);
        const u = Math.min(1, Math.max(0, (d - throat.hide) / throat.reach));
        // Smoothstep, then squared: the river stays full most of the way and
        // is drawn in hard only as it reaches the port.
        const smooth = u * u * (3 - 2 * u);
        k = 0.015 + 0.985 * smooth * (2 - smooth);
        size = d < throat.hide ? 0 : 1;
      }
      this.p.set(wx, y * k, z * k);
      this.e.set(
        this.tilt[i * 3]! * 0.9 + t * 2.2 * this.tilt[i * 3 + 2]!,
        (this.tilt[i * 3 + 1]! * 0.22 + 0.08 * Math.sin(t * 2.3 + a)) * k,
        (this.tilt[i * 3 + 2]! * 0.16 + 0.1 * Math.cos(t * 1.9 + b)) * k,
      );
      this.q.setFromEuler(this.e);
      this.s.setScalar(size);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
