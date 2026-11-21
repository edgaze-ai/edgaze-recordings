import * as THREE from 'three';
import { tokenColor } from '../world';

let envCache: THREE.Texture | null = null;

/**
 * Why: metal with nothing to reflect renders black, and a stock HDRI would
 * put a room full of lights into every surface. The environment here is the
 * studio the brief allows: a black sphere with exactly two softboxes, one
 * where the key sits and one where the rim sits. Reflections agree with the
 * lights, so a highlight is always explained by a light you could point at.
 */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  if (envCache) return envCache;
  const room = new THREE.Scene();
  const black = new THREE.MeshBasicMaterial({
    color: tokenColor('--black'),
    side: THREE.BackSide,
  });
  room.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), black));

  const softbox = (w: number, h: number, power: number, at: THREE.Vector3) => {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    mat.color.setScalar(power);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    panel.position.copy(at);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  };
  // Key: a broad box high and to the left of camera.
  softbox(70, 36, 3.2, new THREE.Vector3(-46, 48, 50));
  // Rim: a tall narrow strip behind and to the right.
  softbox(9, 80, 5, new THREE.Vector3(58, 10, -60));

  const pmrem = new THREE.PMREMGenerator(renderer);
  envCache = pmrem.fromScene(room, 0.012).texture;
  pmrem.dispose();
  return envCache;
}

/**
 * Why: every illustration gets one key and one rim and nothing else, and
 * the stations share one world. A spot with a hard range and 1/d² falloff
 * lights its own object and leaves the next station black, so no beat is
 * ever lit by its neighbour's lamps. `strength` is the illuminance at the
 * target, so a light can be moved without re-tuning it.
 */
export function spot(
  color: THREE.Color,
  strength: number,
  from: THREE.Vector3,
  to: THREE.Vector3,
  {
    angle = 0.42,
    penumbra = 0.9,
    reach = 2.4,
  }: { angle?: number; penumbra?: number; reach?: number } = {},
): THREE.SpotLight {
  const d = from.distanceTo(to);
  const light = new THREE.SpotLight(color, strength * d * d, d * reach, angle, penumbra, 2);
  light.position.copy(from);
  light.target.position.copy(to);
  return light;
}

export type Station = {
  group: THREE.Group;
  key: THREE.SpotLight;
  rim: THREE.SpotLight;
};

/** A station is a place in the world with its own key and rim. */
export function station(
  scene: THREE.Scene,
  origin: THREE.Vector3,
  key: THREE.SpotLight,
  rim: THREE.SpotLight,
): Station {
  const group = new THREE.Group();
  group.position.copy(origin);
  group.add(key, key.target, rim, rim.target);
  scene.add(group);
  return { group, key, rim };
}
