import { describe, expect, it } from 'vitest';
import { analyze, barAt, beatAt, describe as timeline, gridMap, snap } from './beatgrid';

const SR = 22050;

/**
 * A small synthetic track: kick on every beat (accented on beat 1), noisy
 * hats on the off-beats, a constant bass hum, quiet for `quietBars` then
 * loud. Off-beat hats are the case that fools naive trackers.
 */
function track(bpm: number, offsetMs: number, seconds = 24, quietBars = 4): Float32Array {
  const out = new Float32Array(SR * seconds);
  const p = 60 / bpm;
  const o = offsetMs / 1000;
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let i = 0; i < out.length; i += 1) {
    const t = i / SR;
    let v = 0.06 * Math.sin(2 * Math.PI * 55 * t);
    if (t >= o) {
      const u = t - o;
      const k = Math.floor(u / p);
      const ph = u - k * p;
      const accent = k % 4 === 0 ? 1.5 : 1;
      v +=
        accent *
        Math.sin(2 * Math.PI * (50 + 150 * Math.exp(-40 * ph)) * ph) *
        Math.exp(-12 * ph);
      const hp = ph - p / 2;
      if (hp >= 0) v += 0.18 * rand() * Math.exp(-60 * hp);
      if (u < quietBars * 4 * p) v *= 0.3;
    }
    out[i] = v * 0.5;
  }
  return out;
}

describe('analyze', () => {
  for (const [bpm, offset] of [
    [100, 90],
    [124, 180],
    [140, 40],
    [92, 300],
  ] as const) {
    it(`locks ${bpm}bpm on the kick, not the hats`, () => {
      const map = analyze(track(bpm, offset), SR, { source: 'synthetic' });
      expect(map.bpm).toBeGreaterThan(bpm - 0.3);
      expect(map.bpm).toBeLessThan(bpm + 0.3);
      expect(map.steady).toBe(true);
      const p = 60000 / bpm;
      // Every detected beat within 12ms of the truth (under one 60fps frame).
      for (const b of map.beats) {
        const k = Math.round((b - offset) / p);
        expect(Math.abs(b - (offset + k * p))).toBeLessThan(12);
      }
      // Bar 1 is the accented kick.
      const d0 = map.downbeats[0] ?? 0;
      const k0 = Math.round((d0 - offset) / p);
      expect(((k0 % 4) + 4) % 4).toBe(0);
      // The quiet-to-loud switch at bar 5 is reported as a drop.
      expect(map.drops.some((d) => Math.abs(d - (offset + 16 * p)) < 12)).toBe(true);
    });
  }
});

describe('reading a map', () => {
  const map = gridMap(120, 30000, { offset: 0 });

  it('counts bars like a DAW', () => {
    expect(barAt(map, 1)).toBe(0);
    expect(barAt(map, 3)).toBe(4000);
    expect(barAt(map, 3, 2)).toBe(5000);
    expect(barAt(map, 3, 0.5)).toBe(4250);
  });

  it('snaps to beats and subdivisions', () => {
    expect(snap(map, 4120)).toBe(4000);
    expect(snap(map, 4120, 4)).toBe(4125);
    expect(beatAt(map, 59.5)).toBe(29750);
  });

  it('writes a timeline an agent can read', () => {
    const text = timeline(map);
    expect(text).toContain('120.00 bpm');
    expect(text).toContain('bar   downbeat');
  });
});
