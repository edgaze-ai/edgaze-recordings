import * as THREE from 'three';
import { tokenColor } from '../world';

export type Lock = {
  group: THREE.Group;
  pin: THREE.Mesh;
  socket: THREE.Group;
  /** Pin y when fully seated: collar resting on the socket's top face. */
  seated: number;
};

/**
 * Why: a mechanical commitment, not a security icon. A turned steel pin
 * with a chamfered tip and a shoulder, over a machined block with a
 * chamfered bore. The bore is 0.04cm wider than the shaft — that dark
 * hairline ring is the tolerance, and it is what makes the seat read as
 * precise rather than as two shapes touching.
 *
 * The pin is a lathe profile, so its brushing runs around it and the key
 * softbox lays one long highlight down its edge.
 */
export function makeLock(env: THREE.Texture): Lock {
  const steel = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--pr-machined'),
    metalness: 1,
    roughness: 0.2,
    anisotropy: 0.75,
    envMap: env,
    envMapIntensity: 1.35,
  });
  const block = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--pr-machined'),
    metalness: 1,
    roughness: 0.34,
    envMap: env,
    envMapIntensity: 1.1,
  });

  const shaft = 1.46;
  const bore = 1.5;
  const depth = 4.6;
  // (radius, height) from the tip up. Tip chamfer, shaft, shoulder, neck, cap.
  const profile = [
    [0, 0],
    [shaft - 0.3, 0],
    [shaft, 0.3],
    [shaft, depth - 0.05],
    [shaft + 0.08, depth],
    [2.45, depth + 0.02],
    [2.55, depth + 0.12],
    [2.55, depth + 1.0],
    [2.4, depth + 1.15],
    [1.9, depth + 1.2],
    [1.8, depth + 1.35],
    [1.8, depth + 7.4],
    [1.62, depth + 7.6],
    [0, depth + 7.6],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const pin = new THREE.Mesh(new THREE.LatheGeometry(profile, 128), steel);

  // Socket block: rounded square with the bore cut through, extruded down.
  const half = 5;
  const corner = 0.8;
  const outline = new THREE.Shape();
  outline.moveTo(-half + corner, -half);
  outline.lineTo(half - corner, -half);
  outline.quadraticCurveTo(half, -half, half, -half + corner);
  outline.lineTo(half, half - corner);
  outline.quadraticCurveTo(half, half, half - corner, half);
  outline.lineTo(-half + corner, half);
  outline.quadraticCurveTo(-half, half, -half, half - corner);
  outline.lineTo(-half, -half + corner);
  outline.quadraticCurveTo(-half, -half, -half + corner, -half);
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore + 0.22, 0, Math.PI * 2, true);
  outline.holes.push(hole);
  const blockGeo = new THREE.ExtrudeGeometry(outline, {
    depth: 5.4,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
    bevelSegments: 4,
    curveSegments: 96,
  });
  // Extrusion runs along +z; stand it up so the top face is at y = 0.
  blockGeo.rotateX(-Math.PI / 2);
  blockGeo.translate(0, -5.4, 0);
  const socket = new THREE.Group();
  socket.add(new THREE.Mesh(blockGeo, block));

  // The bore itself: a chamfer down into a sleeve whose wall is the fit.
  const sleeve = [
    [bore + 0.22, 0.18],
    [bore + 0.02, -0.12],
    [bore, -0.3],
    [bore, -depth - 0.4],
    [0, -depth - 0.4],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const sleeveMat = block.clone();
  sleeveMat.side = THREE.DoubleSide;
  socket.add(new THREE.Mesh(new THREE.LatheGeometry(sleeve, 128), sleeveMat));

  const group = new THREE.Group();
  group.add(socket, pin);
  // Seated: the shoulder's underside (at pin y = depth) lands on y = 0.18.
  const seated = 0.18 - depth;
  return { group, pin, socket, seated };
}
