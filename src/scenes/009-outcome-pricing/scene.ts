import '../../styles/scene-009.css';
import * as THREE from 'three';
import {
  asset,
  aurora,
  cardIn,
  countUp,
  curve,
  ease,
  flowLight,
  hardCut,
  idleLoop,
  mix,
  fadeOut,
  land,
  mountStage,
  reveal,
  span,
  travel3d,
} from '../../lib/index';
import {
  makeEtch,
  makeGate,
  makeGlassCube,
  makeLock,
  makeNode,
  makeTenants,
  mountWorld,
  spot,
  studioEnvironment,
  tokenColor,
  TokenStream,
  type Lock,
  type RunNode,
  type Tenants,
} from '../../lib/forms/index';

const DURATION = 52000;

/** Every cut in the brief, in one place. */
const CUT = {
  stream: 2_500,
  card2: 7_000,
  /* 9.0: back to the stream for a breath, then a dip to black into the
     finished node. The dip is the film's only picture-to-picture change. */
  stream2: 9_000,
  dip1: 9_380,
  object: 9_860,
  card3: 14_000,
  gate: 16_000,
  card4: 20_500,
  demo: 22_300,
  card5: 26_500,
  sandbox: 28_300,
  card6: 32_000,
  charged: 18_900,
  failed: 33_800,
  strike: 34_750,
  free: 35_180,
  card7: 37_500,
  lock: 39_200,
  dip2: 42_500,
  checkout: 43_000,
  card8: 47_500,
  closing: 49_000,
} as const;

/** Which film times the world is on screen, and what it is showing. */
const SHOT = {
  stream: [CUT.stream, CUT.card2],
  stream2: [CUT.stream2, CUT.object],
  object: [CUT.object, CUT.card3],
  gate: [CUT.gate, CUT.card4],
  sandbox: [CUT.sandbox, CUT.card6],
  lock: [CUT.lock, CUT.checkout],
} as const;

const inShot = (t: number, [a, b]: readonly [number, number]) => t >= a && t < b;

/* ---------------------------------------------------------------- world
 * One space, in centimetres. The completed run — an Edgaze node — is 9cm; a token
 * is 6mm; the gate is 27cm tall; the sandbox is 48cm. Stations sit far
 * enough apart that each spot's range ends before the next one begins.
 *
 *   stream     z = +4000, flowing along +x through a running node
 *   object     origin; the gate is straight ahead of it along -z
 *   sandbox    z = -1000, on its own
 *   lock       z = -3000
 */
const STREAM_O = new THREE.Vector3(0, 0, 4000);
const GATE_Z = -120;
const CUBE = new THREE.Vector3(0, 16, -1000);
const LOCK_O = new THREE.Vector3(0, 0, -3000);

/** Token speed through the running node, cm/s — about two seconds a frame. */
const RIVER = { speed: 30 };
/** The node's attitude per beat. It never rotates on screen. */
const FACE = {
  // Face to the orbiting lens, turned just enough to show its depth.
  object: new THREE.Euler(-0.1, 0.34, 0.03),
  // Face towards the side the gate camera travels on.
  gate: new THREE.Euler(-0.05, 1.45, 0),
};

type Lamp = { key: THREE.SpotLight; rim: THREE.SpotLight; power: [number, number] };

type World = {
  scene: THREE.Scene;
  black: THREE.Color;
  cam: THREE.PerspectiveCamera;
  stream: TokenStream;
  streamGroup: THREE.Group;
  hero: RunNode;
  gate: THREE.Group;
  cube: THREE.Group;
  tenants: Tenants;
  lock: Lock;
  lamps: Record<'stream' | 'object' | 'gate' | 'sandbox' | 'lock', Lamp>;
};

let world: World | null = null;

/**
 * Why: the lid etch is drawn from the Edgaze mark and set in Inter. Both are
 * loaded before the stage mounts — mountStage is what the exporter waits
 * for — so no frame, scrubbed or exported, can render a blank lid.
 */
const preloaded = { mark: new Image() };

function preload(): Promise<unknown> {
  preloaded.mark.src = asset('photos/edgaze-mark').url;
  return Promise.all([preloaded.mark.decode(), document.fonts.load('600 232px Inter')]);
}

function lamp(scene: THREE.Scene, key: THREE.SpotLight, rim: THREE.SpotLight): Lamp {
  scene.add(key, key.target, rim, rim.target);
  return { key, rim, power: [key.intensity, rim.intensity] };
}

function buildWorld(renderer: THREE.WebGLRenderer): World {
  const scene = new THREE.Scene();
  const env = studioEnvironment(renderer);
  const cam = new THREE.PerspectiveCamera(30, 1920 / 1080, 0.5, 2000);

  // 1 — the token stream. Cold brushed steel, low reflectivity.
  const steel = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--pr-steel'),
    metalness: 1,
    roughness: 0.4,
    anisotropy: 0.7,
    envMap: env,
    envMapIntensity: 0.42,
  });
  const stream = new TokenStream(steel, {
    count: 5200,
    seed: 90_091,
    length: 320,
    halfY: 11,
    halfZ: 16,
    speed: RIVER.speed,
    // The river is drawn into the running node's input port and pours out
    // of its output: effort going in, more effort coming out, no end.
    throat: { x: 0, hide: 4.2, reach: 58 },
  });
  const streamGroup = new THREE.Group();
  streamGroup.position.copy(STREAM_O);
  const working = makeNode(env, { kind: 'text', state: 'running' });
  working.group.rotation.set(-0.04, 0.16, 0);
  streamGroup.add(stream.mesh, working.group);
  scene.add(streamGroup);

  // 2, 3 — the finished run: the workflow's Result node, the same one that
  // then passes through the gate, moved between beats, never duplicated.
  const hero = makeNode(env, { kind: 'result', state: 'done' });
  scene.add(hero.group);

  const gate = makeGate(env);
  gate.position.set(0, 0, GATE_Z);
  scene.add(gate);

  // 4 — the sandbox.
  const cube = makeGlassCube(env);
  cube.position.copy(CUBE);
  const tenants = makeTenants(env, { seconds: 7.4 });
  cube.add(tenants.group);
  // The Edgaze mark and "Sandbox", etched into the lid.
  const etch = makeEtch(preloaded.mark);
  etch.position.set(0, 24.02, 2);
  cube.add(etch);
  scene.add(cube);

  // 5 — the lock.
  const lock = makeLock(env);
  lock.group.position.copy(LOCK_O);
  scene.add(lock.group);

  const v = (x: number, y: number, z: number, o = new THREE.Vector3()) =>
    new THREE.Vector3(x, y, z).add(o);
  const cool = tokenColor('--pr-key-cool');
  const steelRim = tokenColor('--pr-steel-rim');
  const warmKey = tokenColor('--pr-key-warm');
  const warmRim = tokenColor('--pr-rim-warm');

  const lamps: World['lamps'] = {
    // The stream's pair travels with the camera; positions are set per frame.
    stream: lamp(
      scene,
      spot(cool, 2.2, v(-30, 60, 60, STREAM_O), STREAM_O, { angle: 0.7, reach: 2.2 }),
      spot(steelRim, 3.4, v(40, 26, -70, STREAM_O), STREAM_O, { angle: 0.7, reach: 2.2 }),
    ),
    object: lamp(
      scene,
      spot(warmKey, 4.2, v(-30, 36, 32), v(0, 0, 0), { angle: 0.36 }),
      spot(warmRim, 6, v(24, 12, -36), v(0, 0, 0), { angle: 0.36 }),
    ),
    gate: lamp(
      scene,
      spot(warmKey, 7.5, v(-46, 44, -40), v(0, 0, GATE_Z), { angle: 0.62, reach: 2 }),
      spot(warmRim, 7, v(36, 18, -196), v(0, 0, GATE_Z), { angle: 0.62, reach: 2 }),
    ),
    sandbox: lamp(
      scene,
      spot(cool, 3.2, v(-60, 72, 70, CUBE), CUBE, { angle: 0.5, reach: 1.7 }),
      spot(warmRim, 5, v(62, 22, -84, CUBE), CUBE, { angle: 0.5, reach: 1.7 }),
    ),
    lock: lamp(
      scene,
      spot(cool, 2.6, v(-18, 26, 14, LOCK_O), v(0, 2, 0, LOCK_O), { angle: 0.5, reach: 2 }),
      spot(steelRim, 4, v(14, 8, -18, LOCK_O), v(0, 2, 0, LOCK_O), { angle: 0.5, reach: 2 }),
    ),
  };

  return {
    scene,
    black: tokenColor('--black'),
    cam,
    stream,
    streamGroup,
    hero,
    gate,
    cube,
    tenants,
    lock,
    lamps,
  };
}

/**
 * Why: every station keeps its lights in the scene for the whole film —
 * changing the light count recompiles every material mid-shot — but only
 * the pair belonging to what is on screen carries any power.
 */
function power(w: World, on: ReadonlyArray<keyof World['lamps']>): void {
  for (const [name, l] of Object.entries(w.lamps) as [keyof World['lamps'], Lamp][]) {
    const live = on.includes(name);
    l.key.intensity = live ? l.power[0] : 0;
    l.rim.intensity = live ? l.power[1] : 0;
  }
}

function aim(
  cam: THREE.PerspectiveCamera,
  from: THREE.Vector3,
  to: THREE.Vector3,
  fov: number,
) {
  cam.position.copy(from);
  if (cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
  cam.lookAt(to);
}

/**
 * Why: a camera-through has to arrive fast and then never stop. This is a
 * slow even drift plus a lead that is spent almost entirely in the first
 * ~700ms: the sum decelerates into the drift without ever reaching zero.
 */
function through(sec: number, lead: number, tau = 0.24): number {
  return lead * Math.exp(-Math.max(0, sec) / tau);
}

/* --------------------------------------------------------------- shots */

/**
 * 1 — "You were paying for effort." A workflow node in its running state sits
 * in the token river. Tokens are drawn into its input and pour out of its
 * output, endlessly; the node never finishes. The lens drifts in slowly and
 * never arrives, and the river runs off both edges of frame.
 */
function poseStream(w: World, t: number) {
  const s = t / 1000;
  w.stream.update(s, 0);
  const o = STREAM_O;
  // One slow move across both times the stream is on screen.
  const p = span(t, CUT.stream, CUT.dip1);
  aim(
    w.cam,
    new THREE.Vector3(
      mix(-7, 4, p),
      mix(4.5, 2.5, p) + 0.3 * Math.sin(s * 0.45),
      mix(46, 38, p),
    ).add(o),
    new THREE.Vector3(mix(-2, 1.5, p), -0.4, 0).add(o),
    30,
  );
  const { key, rim } = w.lamps.stream;
  key.position.set(-30, 60, 60).add(o);
  key.target.position.set(0, 0, 0).add(o);
  rim.position.set(40, 26, -70).add(o);
  rim.target.position.set(0, 0, 0).add(o);
  key.target.updateMatrixWorld();
  rim.target.updateMatrixWorld();
}

function poseObject(w: World, t: number) {
  w.hero.group.position.set(0, 0, 0);
  w.hero.group.rotation.copy(FACE.object);
  // A slow orbit of ~40° across everything the object is on screen for.
  const az = THREE.MathUtils.degToRad(mix(-24, 16, span(t, SHOT.object[0], SHOT.object[1])));
  const r = 36;
  aim(
    w.cam,
    new THREE.Vector3(Math.sin(az) * r, 5.5 - 1.5 * span(t, 9_000, 14_000), Math.cos(az) * r),
    new THREE.Vector3(0, 0.2, 0),
    30,
  );
}

const GATE_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(20, 6.5, 26),
  new THREE.Vector3(46, 7, -60),
  new THREE.Vector3(40, 5, -130),
  new THREE.Vector3(30, 4, -205),
]);

function poseGate(w: World, t: number) {
  const s = (t - CUT.gate) / 1000;
  const heroZ = -58 - 24 * s;
  w.hero.group.position.set(0, 0, heroZ);
  w.hero.group.rotation.copy(FACE.gate);
  const beat = (SHOT.gate[1] - SHOT.gate[0]) / 1000;
  // 30% of the path is spent flying in from the object's station; the rest
  // is the follow round to the far side, at a constant drift.
  const lead = 0.3;
  const u = Math.min(1, lead - through(s, lead) + (1 - lead) * (s / beat));
  const from = GATE_PATH.getPointAt(u);
  const hero = new THREE.Vector3(0, 0, heroZ);
  const gateC = new THREE.Vector3(0, 0, GATE_Z);
  const look = gateC.lerp(hero, mix(0.3, 0.95, curve('--travel')(span(s, 0.4, beat))));
  aim(w.cam, from, look, 30);
}

function poseSandbox(w: World, t: number) {
  w.tenants.pose((t - CUT.sandbox) / 1000 + 0.4);
  const az = THREE.MathUtils.degToRad(mix(-40, 20, span(t, SHOT.sandbox[0], SHOT.sandbox[1])));
  const r = 118;
  aim(
    w.cam,
    new THREE.Vector3(Math.sin(az) * r, 58, Math.cos(az) * r).add(CUBE),
    CUBE.clone().add(new THREE.Vector3(0, -2, 0)),
    30,
  );
}

function poseLock(w: World, t: number) {
  const settle = curve('--quint');
  const p = settle(span(t, CUT.lock - 250, 41_950));
  w.lock.pin.position.y = w.lock.seated + 13 * (1 - p);
  const from = new THREE.Vector3(11, -0.4, 19.5).lerp(new THREE.Vector3(9.2, 0.1, 17.8), p);
  const look = new THREE.Vector3(0, 1.7, 0).lerp(new THREE.Vector3(0, 1.2, 0), p);
  aim(w.cam, from.add(LOCK_O), look.add(LOCK_O), 27);
}

/** Show only what belongs to the shot, so nothing leaks between stations. */
function only(w: World, parts: ReadonlyArray<'stream' | 'hero' | 'gate' | 'cube' | 'lock'>) {
  w.streamGroup.visible = parts.includes('stream');
  w.hero.group.visible = parts.includes('hero');
  w.gate.visible = parts.includes('gate');
  w.cube.visible = parts.includes('cube');
  w.lock.group.visible = parts.includes('lock');
}

void preload().then(() =>
  mountStage({
    width: 1920,
    height: 1080,
    duration: DURATION,
    build(tl, stage) {
      const screen = (name: string) => {
        const el = stage.querySelector<HTMLElement>(`[data-screen="${name}"]`);
        if (!el) throw new Error(`Missing screen ${name}`);
        return el;
      };
      const item = (root: ParentNode, selector: string) => {
        const el = root.querySelector<HTMLElement>(selector);
        if (!el) throw new Error(`Missing element ${selector}`);
        return el;
      };

      const c = {
        c1: screen('c1'),
        c2: screen('c2'),
        c3: screen('c3'),
        c4: screen('c4'),
        c5: screen('c5'),
        c6: screen('c6'),
        c7: screen('c7'),
        c8: screen('c8'),
        closing: screen('closing'),
      };
      const worldScreen = screen('world');
      const demo = screen('demo');
      const failed = screen('failed');
      const checkout = screen('checkout');

      // ------------------------------------------------------------ cards
      const card = (el: HTMLElement, at: number, hold: number, duration = 600) => {
        cardIn(tl, item(el, '.type h1'), { at, hold, duration, follow: item(el, '.flow') });
        flowLight(tl, item(el, '.flow > b'), { at, duration: hold });
      };
      card(c.c1, 0, CUT.stream);
      card(c.c2, CUT.card2, CUT.stream2 - CUT.card2);
      card(c.c3, CUT.card3, CUT.gate - CUT.card3);
      card(c.c4, CUT.card4, CUT.demo - CUT.card4);
      card(c.c5, CUT.card5, CUT.sandbox - CUT.card5);
      card(c.c6, CUT.card6, CUT.failed - CUT.card6);
      card(c.c7, CUT.card7, CUT.lock - CUT.card7);
      card(c.c8, CUT.card8, CUT.closing - CUT.card8);
      // 49.0 — the Edgaze mark, then the name beside it, fading up 700ms from
      // just under size; the pair then creeps with the lens to the last frame.
      const endmark = item(c.closing, '[data-endmark]');
      land(tl, item(endmark, '.endmark-logo'), { at: CUT.closing, duration: 700, from: 0.97 });
      land(tl, item(endmark, '.endmark-word'), {
        at: CUT.closing + 120,
        duration: 700,
        from: 0.985,
      });
      travel3d(tl, endmark, {
        at: CUT.closing,
        duration: DURATION - CUT.closing,
        from: { s: 1 },
        to: { s: 1.02 },
        easing: ease.linear,
      });

      // ------------------------------------------------------------ aurora
      // The brand light rises under the frames that carry the argument: the
      // announcement, the promise, the free demo, the checkout, the payoff
      // line. The closing lockup sits on plain black.
      // Everything else — every 3D beat and every other card — stays black.
      const glow = (el: HTMLElement, at: number, until: number) =>
        aurora(tl, item(el, '[data-aurora]'), { at, duration: until - at });
      // The opening card's glow is smaller and lower (data-low), and drifts
      // slower and shorter, on denser keyframes, so it glides rather than moves.
      aurora(tl, item(c.c1, '[data-aurora]'), {
        at: 0,
        duration: CUT.stream,
        rise: 1300,
        step: 60,
        pace: 0.55,
        amp: 0.5,
      });
      glow(c.c3, CUT.card3, CUT.gate);
      // The gate shot gets a soft version behind the 3D, rising with the cut;
      // it belongs to that shot only, since later beats reuse this screen.
      const gateGlow = item(worldScreen, '[data-aurora]');
      aurora(tl, gateGlow, { at: CUT.gate, duration: CUT.card4 - CUT.gate, rise: 1200 });
      fadeOut(tl, gateGlow, { at: CUT.card4, duration: 1 });
      glow(demo, CUT.demo, CUT.card5);
      glow(checkout, CUT.checkout, CUT.card8);
      glow(c.c8, CUT.card8, CUT.closing);

      // ------------------------------------------------------------- cuts
      // Text and pictures never share a frame and never dissolve into one
      // another: every change of kind is a hard cut.
      hardCut(tl, c.c1, worldScreen, CUT.stream);
      hardCut(tl, worldScreen, c.c2, CUT.card2);
      hardCut(tl, c.c2, worldScreen, CUT.stream2);
      hardCut(tl, worldScreen, c.c3, CUT.card3);
      hardCut(tl, c.c3, worldScreen, CUT.gate);
      hardCut(tl, worldScreen, c.c4, CUT.card4);
      hardCut(tl, c.c4, demo, CUT.demo);
      hardCut(tl, demo, c.c5, CUT.card5);
      hardCut(tl, c.c5, worldScreen, CUT.sandbox);
      hardCut(tl, worldScreen, c.c6, CUT.card6);
      hardCut(tl, c.c6, failed, CUT.failed);
      hardCut(tl, failed, c.c7, CUT.card7);
      hardCut(tl, c.c7, worldScreen, CUT.lock);
      hardCut(tl, worldScreen, checkout, CUT.checkout);
      hardCut(tl, checkout, c.c8, CUT.card8);
      hardCut(tl, c.c8, c.closing, CUT.closing);

      // ------------------------------------------------ the two dips
      // Picture to picture, the film fades through black: the outgoing shot
      // eases away, black holds for a breath, the incoming shot settles in.
      const worldHost = item(worldScreen, '[data-world]');
      // 9.0 — the stream, once more, then into the finished node.
      fadeOut(tl, worldHost, { at: CUT.dip1 });
      land(tl, worldHost, { at: CUT.object + 40, duration: 760, from: 0.985 });
      // 42.5 — the seated pin, then the checkout.
      fadeOut(tl, worldHost, { at: CUT.dip2 });
      land(tl, item(checkout, '.co'), { at: CUT.checkout + 60, duration: 820, from: 0.985 });

      // ------------------------------------------- 18.9 — charged, at the gate
      // The finished node clears the aperture at ~18.6; a beat later the
      // charge arrives from below — the moment you pay is the moment it's done.
      const toast = item(worldScreen, '[data-toast]');
      travel3d(tl, toast, {
        at: CUT.charged,
        duration: 820,
        from: { y: 30, s: 0.96, o: 0 },
        to: { y: 0, s: 1, o: 1 },
      });
      countUp(tl, item(toast, '[data-charge]'), {
        to: 2.49,
        at: CUT.charged + 160,
        duration: 760,
        decimals: 2,
        prefix: '$',
      });
      // It belongs to the gate shot only; later beats reuse the world screen.
      fadeOut(tl, toast, { at: CUT.card4, duration: 1 });

      // --------------------------------------- 33.8 — a failed run, not charged
      // The failed result arrives with its price; the price is struck through,
      // Free clips in, and the brand light rises behind the box on that beat.
      const fm = item(failed, '.fm');
      travel3d(tl, fm, {
        at: CUT.failed,
        duration: 780,
        from: { y: 26, s: 0.975, o: 0 },
        to: { y: 0, s: 1, o: 1 },
      });
      travel3d(tl, item(failed, '[data-rig="failed"]'), {
        at: CUT.failed,
        duration: CUT.card7 - CUT.failed,
        from: { s: 1 },
        to: { s: 1.025 },
        easing: ease.linear,
      });
      tl.add(
        item(failed, '[data-strike]'),
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        {
          delay: CUT.strike,
          duration: 560,
          easing: ease.expo,
          fill: 'forwards',
        },
      );
      reveal(tl, [item(failed, '[data-free]')], { at: CUT.free, duration: 820, step: 0 });
      aurora(tl, item(failed, '[data-aurora]'), {
        at: CUT.free,
        duration: CUT.card7 - CUT.free,
      });

      // ------------------------------------------------ 22.3 — demo modal
      // The real modal, holding still; the lens does the moving.
      travel3d(tl, item(demo, '[data-rig="demo"]'), {
        at: CUT.demo,
        duration: CUT.card5 - CUT.demo,
        from: { s: 1 },
        to: { s: 1.045 },
        easing: ease.linear,
      });

      // ------------------------------------------------ 43.0 — checkout
      // Barely moving. The only transaction in the film; it is allowed to sit.
      travel3d(tl, item(checkout, '[data-rig="checkout"]'), {
        at: CUT.checkout,
        duration: CUT.card8 - CUT.checkout,
        from: { s: 1 },
        to: { s: 1.014 },
        easing: ease.linear,
      });
      // The pack illustrations' own idle keyframes, from FundingCheckoutModal.
      stage.querySelectorAll('[data-pulse="5"]').forEach((el, i) => {
        idleLoop(tl, el, {
          stops: [
            [0, 0.3],
            [0.4, 1],
            [0.7, 0.48],
            [1, 0.3],
          ],
          duration: 3_200,
          delay: i * 220,
        });
      });
      stage.querySelectorAll('[data-pulse="10"]').forEach((el, i) => {
        idleLoop(tl, el, {
          stops: [
            [0, 0.32],
            [0.45, 1],
            [0.75, 0.48],
            [1, 0.32],
          ],
          duration: 3_600,
          delay: i * 120,
        });
      });
      idleLoop(tl, item(checkout, '.tray-10'), {
        stops: [
          [0, 0.55],
          [0.5, 0.95],
          [1, 0.55],
        ],
        duration: 4_000,
      });
      idleLoop(tl, item(checkout, '.w-edge'), {
        stops: [
          [0, 0.5],
          [0.5, 1],
          [1, 0.5],
        ],
        duration: 3_400,
      });
      idleLoop(tl, item(checkout, '.w-plus'), {
        stops: [
          [0, 0.55],
          [0.5, 1],
          [1, 0.55],
        ],
        duration: 2_800,
      });

      // ------------------------------------------------------- the world
      mountWorld(tl, item(worldScreen, '[data-world]'), {
        draw(renderer, t) {
          const w = (world ??= buildWorld(renderer));
          // Transparent only for the gate, so its soft aurora shows behind
          // the 3D. Every other shot keeps a real black background: three.js
          // fills a transmission pass with white when the scene has none, and
          // the sandbox glass would turn opaque.
          w.scene.background = inShot(t, SHOT.gate) ? null : w.black;

          if (inShot(t, SHOT.stream) || inShot(t, SHOT.stream2)) {
            only(w, ['stream']);
            power(w, ['stream']);
            poseStream(w, t);
          } else if (inShot(t, SHOT.object)) {
            only(w, ['hero']);
            power(w, ['object']);
            poseObject(w, t);
          } else if (inShot(t, SHOT.gate)) {
            only(w, ['hero', 'gate']);
            power(w, ['gate']);
            poseGate(w, t);
          } else if (inShot(t, SHOT.sandbox)) {
            only(w, ['cube']);
            power(w, ['sandbox']);
            poseSandbox(w, t);
          } else if (inShot(t, SHOT.lock)) {
            only(w, ['lock']);
            power(w, ['lock']);
            poseLock(w, t);
          } else {
            return;
          }
          renderer.render(w.scene, w.cam);
        },
      });
    },
  }),
);
