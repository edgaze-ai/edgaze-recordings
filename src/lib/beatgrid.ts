/**
 * Why: a launch film lives or dies on cuts landing on the beat. Guessing
 * millisecond timings by ear is how a wipe ends up 40ms late. This module
 * turns any track into a beat map — tempo, every beat, bar downbeats,
 * energy per bar, sections, drops, and the strongest accents — that a scene
 * reads from, and that an agent can read as a plain-text timeline before it
 * storyboards a single word.
 *
 * Pure and dependency-free on purpose: the same file runs in Vite (scenes)
 * and directly under Node (scripts/beats.mjs) with type stripping. Keep it
 * free of imports and of TS-only syntax (enums, parameter properties).
 */

export type Section = {
  /** 1-based bar numbers, inclusive. */
  fromBar: number;
  toBar: number;
  at: number;
  end: number;
  energy: number;
  level: 'quiet' | 'low' | 'mid' | 'high' | 'peak';
};

export type Accent = { at: number; strength: number; beat: number; offBy: number };

export type BeatMap = {
  source: string;
  bpm: number;
  /** ms per beat. */
  period: number;
  duration: number;
  beatsPerBar: number;
  /** Every beat in ms from the start of the track. */
  beats: number[];
  /** First beat of each bar in ms. downbeats[0] is bar 1. */
  downbeats: number[];
  /** RMS energy per bar, normalized 0..1 across the track. */
  barEnergy: number[];
  sections: Section[];
  /** Downbeats where energy jumps — the places a big cut belongs. */
  drops: number[];
  accents: Accent[];
  /** True when the beats fit one constant tempo within a few ms. */
  steady: boolean;
  /** 0..1 — how much stronger onsets are on the grid than off it. */
  confidence: number;
};

// ─── reading a map ──────────────────────────────────────────────────────

/** Beat n (0-based) in ms; extrapolates past the end at the track tempo. */
export function beatAt(map: BeatMap, n: number): number {
  const whole = Math.floor(n);
  const frac = n - whole;
  const at = (i: number) => {
    if (i >= 0 && i < map.beats.length) return map.beats[i] as number;
    const last = map.beats.length - 1;
    const base = i < 0 ? (map.beats[0] ?? 0) : (map.beats[last] ?? 0);
    return base + (i < 0 ? i : i - last) * map.period;
  };
  return round(at(whole) + (at(whole + 1) - at(whole)) * frac);
}

/** Bar n (1-based, like a DAW) plus `beat` beats into it, in ms. */
export function barAt(map: BeatMap, bar: number, beat = 0): number {
  const first = map.downbeats[0] ?? map.beats[0] ?? 0;
  const firstIndex = nearestIndex(map.beats, first);
  return beatAt(map, firstIndex + (bar - 1) * map.beatsPerBar + beat);
}

/** Nearest beat subdivision to `ms`. div 2 = 8ths, div 4 = 16ths. */
export function snap(map: BeatMap, ms: number, div = 1): number {
  const i = nearestIndex(map.beats, ms);
  let best = map.beats[i] ?? ms;
  for (const n of [i - 1, i]) {
    for (let k = 0; k <= div; k += 1) {
      const t = beatAt(map, n + k / div);
      if (Math.abs(t - ms) < Math.abs(best - ms)) best = t;
    }
  }
  return round(best);
}

/** Beats in [from, to), optionally every `every`th one. */
export function beatsIn(map: BeatMap, from: number, to: number, every = 1): number[] {
  const first = nearestIndex(map.beats, map.beats[0] ?? 0);
  return map.beats.filter((t, i) => t >= from && t < to && (i - first) % every === 0);
}

function nearestIndex(list: number[], ms: number): number {
  let lo = 0;
  let hi = list.length - 1;
  if (hi < 0) return 0;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((list[mid] as number) < ms) lo = mid + 1;
    else hi = mid;
  }
  if (
    lo > 0 &&
    Math.abs((list[lo - 1] as number) - ms) <= Math.abs((list[lo] as number) - ms)
  ) {
    return lo - 1;
  }
  return lo;
}

// ─── exact grids (synthesized score) ────────────────────────────────────

/**
 * A synthesized score has no uncertainty: its grid is the tempo. Sections
 * can be declared by the scene so the readable timeline still shows where
 * the energy goes.
 */
export function gridMap(
  bpm: number,
  duration: number,
  {
    offset = 0,
    beatsPerBar = 4,
    source = 'score',
    energy,
  }: { offset?: number; beatsPerBar?: number; source?: string; energy?: number[] } = {},
): BeatMap {
  const period = 60000 / bpm;
  const beats: number[] = [];
  for (let t = offset; t < duration - 0.5; t += period) beats.push(round(t));
  const downbeats = beats.filter((_, i) => i % beatsPerBar === 0);
  const barEnergy = downbeats.map((_, i) => energy?.[i] ?? 0.5);
  return finish({
    source,
    bpm,
    period,
    duration,
    beatsPerBar,
    beats,
    downbeats,
    barEnergy,
    accents: [],
    steady: true,
    confidence: 1,
  });
}

// ─── analysis ───────────────────────────────────────────────────────────

/**
 * Beat-track mono PCM. Steps, each chosen for reliability over cleverness:
 *  1. Log-magnitude spectral flux (full band + a sub-150Hz kick band).
 *  2. Tempo from the autocorrelation of the onset envelope, weighted toward
 *     the 90–150bpm range most edited music sits in, with octave checks.
 *  3. Dynamic-programming beat tracking (Ellis 2007) so beats follow the
 *     music even where it breaks down.
 *  4. A constant-tempo fit over those beats. Produced music is on a grid; if
 *     the fit is within ~15ms we use it, which removes per-beat jitter.
 *  5. Downbeat phase from where kicks and energy changes concentrate.
 */
export function analyze(
  samples: Float32Array,
  sampleRate: number,
  {
    source = 'track',
    minBpm = 70,
    maxBpm = 180,
    beatsPerBar = 4,
    bpm: forcedBpm,
  }: {
    source?: string;
    minBpm?: number;
    maxBpm?: number;
    beatsPerBar?: number;
    bpm?: number;
  } = {},
): BeatMap {
  const hop = 128;
  const win = 512;
  const fps = sampleRate / hop;
  const duration = (samples.length / sampleRate) * 1000;
  const { flux, low, rms } = spectralFlux(samples, sampleRate, win, hop);
  const env = normalize(highpass(flux, Math.round(fps * 0.4)));
  const lowEnv = normalize(highpass(low, Math.round(fps * 0.4)));

  const tempoEnv = env.map((v, i) => v + (lowEnv[i] as number));
  const lagPeriod = forcedBpm
    ? (60 * fps) / forcedBpm
    : estimatePeriod(tempoEnv, fps, minBpm, maxBpm);
  const dpBeats = trackBeats(normalize(tempoEnv), lagPeriod);
  const toMs = (f: number) => (f * hop * 1000) / sampleRate + (win / 2 / sampleRate) * 1000;

  // Constant-tempo fit: least squares of beat index against time.
  let beats = dpBeats.map(toMs);
  let period = (lagPeriod * hop * 1000) / sampleRate;
  let steady = false;
  if (beats.length >= 8) {
    // Index each beat by its grid position, so a beat the tracker skipped
    // in a breakdown does not bend the fit.
    const p0 = (lagPeriod * hop * 1000) / sampleRate;
    const idx = beats.map((t) => Math.round((t - (beats[0] as number)) / p0));
    const fit = linearFit(beats, idx);
    const resid = beats.map((t, i) => Math.abs(t - (fit.a + fit.b * (idx[i] as number))));
    const med = median(resid);
    if (med < 15) {
      steady = true;
      period = fit.b;
      // Refine phase: slide the grid ±25ms to where onset strength peaks.
      const count = (idx[idx.length - 1] ?? 0) + 1;
      let phase = refinePhase(tempoEnv, fps, fit.a, period, count, toMs(0));
      // Beats carry the low end; off-beats carry hats. If the kick band is
      // clearly stronger half a beat later, the tracker locked to the hats.
      const lowAt = (start: number) => {
        let sum = 0;
        for (let i = 0; i < count; i += 1) {
          const f = Math.round(((start + i * period - toMs(0)) / 1000) * fps);
          sum += Math.max(lowEnv[f - 1] ?? 0, lowEnv[f] ?? 0, lowEnv[f + 1] ?? 0);
        }
        return sum;
      };
      if (lowAt(phase + period / 2) > 1.25 * lowAt(phase)) {
        phase = refinePhase(tempoEnv, fps, phase + period / 2, period, count, toMs(0));
      }
      const first = phase - Math.floor(phase / period) * period;
      beats = [];
      for (let t = first; t < duration - 1; t += period) beats.push(t);
    } else {
      period = median(diffs(beats));
    }
  }

  const strengthAt = (series: Float32Array, ms: number) => {
    const f = Math.round(((ms - toMs(0)) / 1000) * fps);
    let best = 0;
    for (let k = -2; k <= 2; k += 1) best = Math.max(best, series[f + k] ?? 0);
    return best;
  };

  // Downbeat phase: kicks + energy rises concentrate on beat 1.
  const beatRms = beats.map((t) =>
    meanRange(rms, Math.round(((t - toMs(0)) / 1000) * fps), Math.round((period / 1000) * fps)),
  );
  let bestPhase = 0;
  let bestScore = -Infinity;
  for (let p = 0; p < beatsPerBar; p += 1) {
    let score = 0;
    let n = 0;
    for (let i = p; i < beats.length; i += beatsPerBar) {
      const t = beats[i] as number;
      const rise = Math.max(0, (beatRms[i] ?? 0) - (beatRms[i - 1] ?? 0));
      score += strengthAt(lowEnv, t) * 1.0 + strengthAt(env, t) * 0.5 + rise * 6;
      n += 1;
    }
    score /= Math.max(1, n);
    if (score > bestScore) {
      bestScore = score;
      bestPhase = p;
    }
  }
  // Pickup beats before the first downbeat stay in `beats`.
  const downbeats = beats.filter(
    (_, i) => i >= bestPhase && (i - bestPhase) % beatsPerBar === 0,
  );

  const barEnergyRaw = downbeats.map((t, i) => {
    const end = downbeats[i + 1] ?? Math.min(duration, t + period * beatsPerBar);
    const a = Math.round(((t - toMs(0)) / 1000) * fps);
    const b = Math.round(((end - toMs(0)) / 1000) * fps);
    return meanRange(rms, a, Math.max(1, b - a));
  });
  // A truncated last bar is a transient, not a bar; keep it out of the scale.
  const fullBars = barEnergyRaw.filter(
    (_, i) => (downbeats[i] as number) + period * beatsPerBar * 0.75 <= duration,
  );
  const barEnergy = scale01(barEnergyRaw, fullBars.length >= 2 ? fullBars : barEnergyRaw);

  const onGrid = beats.map((t) => strengthAt(env, t));
  const offGrid = beats.map((t) => strengthAt(env, t + period / 2.6));
  const confidence = clamp01(
    (mean(onGrid) - mean(offGrid)) / Math.max(0.5, mean(onGrid)) + 0.15,
  );

  const accents = pickAccents(env, fps, toMs, beats, period);

  return finish({
    source,
    bpm: 60000 / period,
    period,
    duration,
    beatsPerBar,
    beats: beats.map((t) => round(t)),
    downbeats: downbeats.map((t) => round(t)),
    barEnergy,
    accents,
    steady,
    confidence: round(confidence, 2),
  });
}

function finish(map: Omit<BeatMap, 'sections' | 'drops'>): BeatMap {
  const sections = sectionsOf(
    map.barEnergy,
    map.downbeats,
    map.duration,
    map.period * map.beatsPerBar,
  );
  const drops: number[] = [];
  map.barEnergy.forEach((e, i) => {
    if (i === 0) return;
    const before = map.barEnergy[i - 1] ?? 0;
    const at = map.downbeats[i] as number;
    // A truncated last bar measures loud or quiet by accident; skip it.
    const full = at + map.period * map.beatsPerBar * 0.75 <= map.duration;
    if (full && e - before >= 0.22 && e >= 0.5) drops.push(at);
  });
  return {
    ...map,
    bpm: round(map.bpm, 2),
    period: round(map.period, 3),
    duration: round(map.duration),
    barEnergy: map.barEnergy.map((e) => round(e, 2)),
    sections,
    drops,
  };
}

function sectionsOf(
  energy: number[],
  downbeats: number[],
  duration: number,
  barMs: number,
): Section[] {
  const level = (e: number): Section['level'] =>
    e < 0.15 ? 'quiet' : e < 0.4 ? 'low' : e < 0.65 ? 'mid' : e < 0.88 ? 'high' : 'peak';
  const out: Section[] = [];
  energy.forEach((e, i) => {
    const lv = level(e);
    const at = downbeats[i] as number;
    const end = downbeats[i + 1] ?? Math.min(duration, at + barMs);
    const prev = out[out.length - 1];
    if (prev && prev.level === lv) {
      prev.toBar = i + 1;
      prev.end = round(end);
      prev.energy = round(
        (prev.energy * (i + 1 - prev.fromBar) + e) / (i + 2 - prev.fromBar),
        2,
      );
      return;
    }
    out.push({
      fromBar: i + 1,
      toBar: i + 1,
      at: round(at),
      end: round(end),
      energy: round(e, 2),
      level: lv,
    });
  });
  return out;
}

// ─── DSP ────────────────────────────────────────────────────────────────

function spectralFlux(x: Float32Array, sr: number, win: number, hop: number) {
  const frames = Math.max(1, Math.floor((x.length - win) / hop) + 1);
  const flux = new Float32Array(frames);
  const low = new Float32Array(frames);
  const rms = new Float32Array(frames);
  const hann = new Float32Array(win);
  for (let i = 0; i < win; i += 1) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / win);
  const bins = win / 2;
  const lowBin = Math.max(3, Math.round((180 * win) / sr));
  let prev = new Float32Array(bins);
  const re = new Float64Array(win);
  const im = new Float64Array(win);
  for (let f = 0; f < frames; f += 1) {
    const o = f * hop;
    let e = 0;
    for (let i = 0; i < win; i += 1) {
      const s = x[o + i] ?? 0;
      e += s * s;
      re[i] = s * (hann[i] as number);
      im[i] = 0;
    }
    rms[f] = Math.sqrt(e / win);
    fft(re, im);
    const mag = new Float32Array(bins);
    let sum = 0;
    let lsum = 0;
    for (let k = 1; k < bins; k += 1) {
      const m = Math.log1p(100 * Math.hypot(re[k] as number, im[k] as number));
      mag[k] = m;
      const d = m - (prev[k] as number);
      if (d > 0) {
        sum += d;
        if (k <= lowBin) lsum += d;
      }
    }
    flux[f] = sum;
    low[f] = lsum;
    prev = mag;
  }
  return { flux, low, rms };
}

/** In-place iterative radix-2 FFT. */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j] as number, re[i] as number];
      [im[i], im[j]] = [im[j] as number, im[i] as number];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k;
        const b = a + len / 2;
        const tr = (re[b] as number) * cr - (im[b] as number) * ci;
        const ti = (re[b] as number) * ci + (im[b] as number) * cr;
        re[b] = (re[a] as number) - tr;
        im[b] = (im[a] as number) - ti;
        re[a] = (re[a] as number) + tr;
        im[a] = (im[a] as number) + ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

/** Subtract a moving average and half-wave rectify: keeps onsets, drops level. */
function highpass(x: Float32Array, w: number): Float32Array {
  const out = new Float32Array(x.length);
  let acc = 0;
  const half = Math.max(1, Math.floor(w / 2));
  for (let i = 0; i < Math.min(x.length, half); i += 1) acc += x[i] as number;
  let count = Math.min(x.length, half);
  for (let i = 0; i < x.length; i += 1) {
    const add = i + half;
    const rem = i - half - 1;
    if (add < x.length) {
      acc += x[add] as number;
      count += 1;
    }
    if (rem >= 0) {
      acc -= x[rem] as number;
      count -= 1;
    }
    out[i] = Math.max(0, (x[i] as number) - acc / count);
  }
  return out;
}

function normalize(x: Float32Array): Float32Array {
  const sd = Math.sqrt(mean(Array.from(x, (v) => v * v))) || 1;
  return x.map((v) => v / sd);
}

/**
 * Tempo in two passes, chosen for reliability:
 *  1. Harmonic-weighted autocorrelation proposes the strongest few periods.
 *  2. Each proposal and its musical relatives (½, ⅔, ¾, 1, 4⁄3, 3⁄2, 2) is
 *     refined to 0.01-frame precision and scored as a pulse train — the
 *     best-phase mean onset strength on its grid. A pulse train is not
 *     fooled by off-beat hats: a 1.5-beat period alternates kick and hat
 *     and loses. Refinement matters: a grid 0.1 frame off drifts off its
 *     own peaks within a few bars.
 * Half-tempo is then settled by an explicit octave rule: take the fastest
 * period whose grid is still as strong as the slower one's.
 */
function estimatePeriod(
  full: Float32Array,
  fps: number,
  minBpm: number,
  maxBpm: number,
): number {
  const env = full.length > fps * 90 ? full.subarray(0, Math.round(fps * 90)) : full;
  const minLag = (60 * fps) / maxBpm;
  const maxLag = (60 * fps) / minBpm;
  const top = Math.ceil(maxLag * 4) + 2;
  const ac = new Float64Array(top + 1);
  for (let lag = 1; lag <= top; lag += 1) {
    let s = 0;
    for (let i = lag; i < env.length; i += 1)
      s += (env[i] as number) * (env[i - lag] as number);
    ac[lag] = s / Math.max(1, env.length - lag);
  }
  const acScore = (lag: number) =>
    (ac[Math.round(lag)] ?? 0) +
    0.5 * (ac[Math.round(lag * 2)] ?? 0) +
    0.25 * (ac[Math.round(lag * 4)] ?? 0);
  const peaks: { lag: number; s: number }[] = [];
  for (let lag = Math.floor(minLag); lag <= Math.ceil(maxLag); lag += 1) {
    const v = acScore(lag);
    if (v >= acScore(lag - 1) && v >= acScore(lag + 1)) peaks.push({ lag, s: v });
  }
  peaks.sort((a, b) => b.s - a.s);

  const G = (lag: number) => gridStrength(env, lag);
  const refine = (lag: number) => {
    let best = lag;
    let bestS = -Infinity;
    for (let d = -1.2; d <= 1.2; d += 0.05) {
      const s = G(lag + d);
      if (s > bestS) {
        bestS = s;
        best = lag + d;
      }
    }
    for (let d = -0.05; d <= 0.05; d += 0.005) {
      const s = G(best + d);
      if (s > bestS) {
        bestS = s;
        best += d;
      }
    }
    return { lag: best, s: bestS };
  };

  const ratios = [1, 2 / 3, 3 / 2, 1 / 2, 2, 3 / 4, 4 / 3];
  const tried: { lag: number; s: number }[] = [];
  for (const p of peaks.slice(0, 3)) {
    for (const r of ratios) {
      const lag = p.lag * r;
      if (lag < minLag * 0.98 || lag > maxLag * 1.02) continue;
      if (tried.some((t) => Math.abs(t.lag - lag) < 1.5)) continue;
      tried.push(refine(lag));
    }
  }
  if (!tried.length) return (minLag + maxLag) / 2;
  const prior = (lag: number) =>
    0.9 + 0.1 * Math.exp(-0.5 * (Math.log2((60 * fps) / lag / 120) / 1.1) ** 2);
  let best = tried.reduce((a, b) => (b.s * prior(b.lag) > a.s * prior(a.lag) ? b : a));
  for (;;) {
    const half = best.lag / 2;
    if (half < minLag * 0.98) break;
    const h = refine(half);
    if (h.s < 0.85 * best.s) break;
    best = h;
  }
  return best.lag;
}

/** Best-phase mean onset strength on a grid of period `lag` frames. */
export function gridStrength(env: Float32Array, lag: number): number {
  let best = 0;
  const peak = (f: number) => {
    const i = Math.round(f);
    return Math.max(env[i - 1] ?? 0, env[i] ?? 0, env[i + 1] ?? 0);
  };
  for (let phase = 0; phase < lag; phase += 1) {
    let s = 0;
    let n = 0;
    for (let f = phase; f < env.length; f += lag) {
      s += peak(f);
      n += 1;
    }
    if (n && s / n > best) best = s / n;
  }
  return best;
}

function trackBeats(env: Float32Array, period: number): number[] {
  const n = env.length;
  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const tight = 100;
  for (let t = 0; t < n; t += 1) {
    const lo = Math.max(0, Math.round(t - 2 * period));
    const hi = Math.round(t - period / 2);
    let best = 0;
    let arg = -1;
    for (let p = lo; p <= hi; p += 1) {
      const r = Math.log((t - p) / period);
      const s = (score[p] as number) - tight * r * r;
      if (arg < 0 || s > best) {
        best = s;
        arg = p;
      }
    }
    score[t] = (env[t] as number) + (arg >= 0 ? Math.max(0, best) : 0);
    back[t] = arg >= 0 && best > 0 ? arg : -1;
  }
  let t = n - 1;
  let best = -Infinity;
  for (let i = Math.max(0, Math.round(n - period)); i < n; i += 1) {
    if ((score[i] as number) > best) {
      best = score[i] as number;
      t = i;
    }
  }
  const beats: number[] = [];
  while (t >= 0) {
    beats.push(t);
    t = back[t] as number;
  }
  return beats.reverse();
}

function refinePhase(
  env: Float32Array,
  fps: number,
  a: number,
  period: number,
  count: number,
  ms0: number,
): number {
  let best = a;
  let bestScore = -Infinity;
  for (let d = -25; d <= 25; d += 1) {
    let s = 0;
    for (let i = 0; i < count; i += 1) {
      const f = Math.round(((a + d + i * period - ms0) / 1000) * fps);
      s += env[f] ?? 0;
    }
    if (s > bestScore) {
      bestScore = s;
      best = a + d;
    }
  }
  return best;
}

function pickAccents(
  env: Float32Array,
  fps: number,
  toMs: (f: number) => number,
  beats: number[],
  period: number,
): Accent[] {
  const m = mean(Array.from(env));
  const sd = Math.sqrt(mean(Array.from(env, (v) => (v - m) ** 2))) || 1;
  const gap = Math.round(fps * 0.12);
  const peaks: { f: number; s: number }[] = [];
  for (let f = 1; f < env.length - 1; f += 1) {
    const v = env[f] as number;
    if (v < m + 2.5 * sd) continue;
    let isPeak = true;
    for (let k = -gap; k <= gap; k += 1) {
      if (k !== 0 && (env[f + k] ?? 0) > v) isPeak = false;
    }
    if (isPeak) peaks.push({ f, s: v });
  }
  const top = peaks.sort((x, y) => y.s - x.s).slice(0, 48);
  const maxS = top[0]?.s ?? 1;
  return top
    .map(({ f, s }) => {
      const at = toMs(f);
      const i = nearestIndex(beats, at);
      const b = beats[i] ?? at;
      return {
        at: round(at),
        strength: round(s / maxS, 2),
        beat: round(i + (at - b) / period, 2),
        offBy: round(at - b),
      };
    })
    .sort((x, y) => x.at - y.at);
}

// ─── readable timeline ─────────────────────────────────────────────────

const BLOCKS = ' ▁▂▃▄▅▆▇█';

/**
 * The plain-text view an agent reads before storyboarding: tempo, the
 * section map, drops, and one line per bar with its exact beat times.
 */
export function describe(map: BeatMap): string {
  const bar = map.period * map.beatsPerBar;
  const spark = map.barEnergy.map((e) => BLOCKS[Math.round(e * 8)] ?? ' ').join('');
  const lines: string[] = [];
  lines.push(`# Beat map — ${map.source}`);
  lines.push('');
  lines.push(
    `- tempo **${map.bpm.toFixed(2)} bpm** · beat ${map.period.toFixed(1)}ms · bar ${bar.toFixed(1)}ms · ${map.beatsPerBar}/4`,
  );
  lines.push(
    `- duration ${(map.duration / 1000).toFixed(2)}s · ${map.beats.length} beats · ${map.downbeats.length} bars · first downbeat ${map.downbeats[0] ?? 0}ms`,
  );
  lines.push(
    `- grid ${map.steady ? 'steady (constant tempo fit)' : 'free (tempo drifts — use beats[], not math)'} · confidence ${map.confidence.toFixed(2)}${map.confidence < 0.5 ? ' ⚠ low: check by ear before cutting to it' : ''}`,
  );
  lines.push(`- energy by bar \`${spark}\``);
  lines.push('');
  lines.push('## Sections');
  lines.push('');
  lines.push('| bars | from ms | to ms | level | energy |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const s of map.sections) {
    lines.push(
      `| ${s.fromBar}–${s.toBar} | ${s.at} | ${s.end} | ${s.level} | ${s.energy.toFixed(2)} |`,
    );
  }
  lines.push('');
  lines.push('## Drops — put the biggest cuts here');
  lines.push('');
  if (!map.drops.length) lines.push('- none detected');
  for (const d of map.drops) {
    const i = map.downbeats.indexOf(d);
    lines.push(
      `- bar ${i + 1} @ **${d}ms** (energy ${(map.barEnergy[i - 1] ?? 0).toFixed(2)} → ${(map.barEnergy[i] ?? 0).toFixed(2)})`,
    );
  }
  lines.push('');
  lines.push('## Bars');
  lines.push('');
  lines.push('```');
  lines.push('bar   downbeat  energy        beats (ms)');
  map.downbeats.forEach((d, i) => {
    const next = map.downbeats[i + 1] ?? Infinity;
    const inBar = map.beats.filter((t) => t >= d && t < next).map((t) => String(t).padStart(9));
    const e = map.barEnergy[i] ?? 0;
    const meter = '█'.repeat(Math.round(e * 10)).padEnd(10, '·');
    const drop = map.drops.includes(d) ? '  ◀ drop' : '';
    lines.push(
      `${String(i + 1).padStart(3)}  ${String(d).padStart(8)}  ${meter}  ${inBar.join('')}${drop}`,
    );
  });
  lines.push('```');
  if (map.accents.length) {
    lines.push('');
    lines.push('## Strongest accents — hits, slams, flashes');
    lines.push('');
    lines.push('```');
    lines.push('    ms  strength  beat#   off-grid');
    for (const a of map.accents) {
      lines.push(
        `${String(a.at).padStart(6)}  ${a.strength.toFixed(2).padStart(8)}  ${a.beat.toFixed(2).padStart(6)}  ${(a.offBy >= 0 ? '+' : '') + a.offBy}ms`,
      );
    }
    lines.push('```');
  }
  lines.push('');
  lines.push(
    'Use in a scene: `barAt(map, 5)` = bar 5 downbeat, `barAt(map, 5, 2)` = its third beat, `snap(map, ms, 2)` = nearest 8th.',
  );
  return lines.join('\n') + '\n';
}

// ─── small maths ───────────────────────────────────────────────────────

function round(x: number, d = 1): number {
  const p = 10 ** d;
  return Math.round(x * p) / p;
}
function mean(x: number[]): number {
  return x.length ? x.reduce((a, b) => a + b, 0) / x.length : 0;
}
function median(x: number[]): number {
  if (!x.length) return 0;
  const s = [...x].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
}
function diffs(x: number[]): number[] {
  return x.slice(1).map((v, i) => v - (x[i] as number));
}
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function meanRange(x: Float32Array, a: number, n: number): number {
  let s = 0;
  let c = 0;
  for (let i = Math.max(0, a); i < Math.min(x.length, a + n); i += 1) {
    s += x[i] as number;
    c += 1;
  }
  return c ? s / c : 0;
}
function scale01(x: number[], ref: number[] = x): number[] {
  if (!x.length) return [];
  const s = [...ref].sort((a, b) => a - b);
  const lo = s[Math.floor(s.length * 0.05)] ?? 0;
  const hi = s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 1;
  return x.map((v) => clamp01((v - lo) / Math.max(1e-9, hi - lo)));
}
function linearFit(y: number[], x: number[]): { a: number; b: number } {
  const mx = mean(x);
  const my = mean(y);
  let num = 0;
  let den = 0;
  y.forEach((v, i) => {
    const xi = x[i] as number;
    num += (xi - mx) * (v - my);
    den += (xi - mx) ** 2;
  });
  const b = num / den;
  return { a: my - b * mx, b };
}
