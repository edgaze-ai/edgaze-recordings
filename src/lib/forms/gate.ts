import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { tokenColor } from '../world';

/**
 * Why: a doorway with no wall. Four machined bars with a small rounded
 * bevel: the bevel is what catches the rim softbox as one bright hairline,
 * so the edge highlight comes from the light, not from an emissive edge.
 * The profile is deep and thin so the three-quarter camera can read how
 * little is there.
 */
export function makeGate(
  env: THREE.Texture,
  {
    width = 14,
    height = 27,
    bar = 1.1,
    deep = 2,
  }: { width?: number; height?: number; bar?: number; deep?: number } = {},
): THREE.Group {
  const metal = new THREE.MeshPhysicalMaterial({
    color: tokenColor('--pr-dark-metal'),
    metalness: 1,
    roughness: 0.2,
    envMap: env,
    envMapIntensity: 4.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.08,
  });
  const r = 0.22;
  const side = new RoundedBoxGeometry(bar, height + bar * 2, deep, 4, r);
  const cap = new RoundedBoxGeometry(width, bar, deep, 4, r);
  const gate = new THREE.Group();
  const left = new THREE.Mesh(side, metal);
  left.position.set(-(width + bar) / 2, 0, 0);
  const right = new THREE.Mesh(side, metal);
  right.position.set((width + bar) / 2, 0, 0);
  const top = new THREE.Mesh(cap, metal);
  top.position.set(0, (height + bar) / 2, 0);
  const bottom = new THREE.Mesh(cap, metal);
  bottom.position.set(0, -(height + bar) / 2, 0);
  gate.add(left, right, top, bottom);
  return gate;
}
