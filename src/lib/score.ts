import { seeded } from './curve';

/**
 * Why: a launch film without sound is a GIF. The score is written in the
 * scene next to the storyboard, in the same absolute milliseconds, so a
 * whoosh lands on the frame its wipe covers and a hit lands on the frame its
 * word does. It is a plain list of cues — testable, diffable, and rendered
 * offline so preview and export hear exactly the same mix.
 *
 * Music layers (drums, bass, pads, arps) are synthesized from a fixed seed.
 * Drop a licensed track into src/assets/music and pass `music` to
 * mountStage; the synthesized music layers then mute and only the sound
 * design (sfx layer) plays over the track.
 */
export type Cue =
  | { kind: 'kick'; at: number; gain?: number }
  | { kind: 'clap'; at: number }
  | { kind: 'hat'; at: number; open?: boolean }
  | { kind: 'snare'; at: number; gain?: number }
  | { kind: 'bass'; at: number; note: number; len: number }
  | { kind: 'pad'; at: number; notes: number[]; len: number }
  | { kind: 'pluck'; at: number; note: number; pan?: number }
  | { kind: 'riser'; at: number; len: number }
  | { kind: 'whoosh'; at: number; len: number; dir: 1 | -1 }
  | { kind: 'impact'; at: number; gain?: number }
  | { kind: 'hit'; at: number }
  | { kind: 'tick'; at: number; note?: number }
  | { kind: 'stab'; at: number; notes: number[]; len: number; gain?: number }
  | { kind: 'vox'; at: number; note: number; vowel: Vowel; len: number; gain?: number }
  | { kind: 'shout'; at: number }
  | { kind: 'key'; at: number }
  | { kind: 'pop'; at: number; note?: number }
  | { kind: 'sparkle'; at: number; dir?: 1 | -1 }
  | { kind: 'subdrop'; at: number };

export type Vowel = 'ah' | 'oh' | 'ee' | 'eh';

/** First three formants (Hz) of sung vowels — what makes a saw sound sung. */
const FORMANTS: Record<Vowel, [number, number, number]> = {
  ah: [800, 1150, 2900],
  oh: [450, 800, 2830],
  ee: [300, 2250, 3000],
  eh: [530, 1840, 2480],
};

/**
 * A two-bar vocal-chop hook on the major pentatonic, [beat, midi, vowel,
 * length in beats]. Chopped, pitched voices are what makes a modern launch
 * track feel sung without a singer.
 */
const HOOK: [number, number, Vowel, number][][] = [
  [
    [0.5, 72, 'ah', 0.4],
    [1, 74, 'oh', 0.4],
    [1.75, 76, 'ah', 0.7],
    [2.75, 79, 'ee', 0.4],
    [3.5, 76, 'oh', 0.4],
  ],
  [
    [0.5, 74, 'ah', 0.4],
    [1.25, 72, 'oh', 0.5],
    [2, 69, 'ah', 1],
    [3.5, 67, 'oh', 0.4],
  ],
];

export type CueKind = Cue['kind'];

const MUSIC: ReadonlySet<CueKind> = new Set([
  'kick',
  'clap',
  'hat',
  'snare',
  'bass',
  'pad',
  'pluck',
  'stab',
  'vox',
  'shout',
]);

export function layerOf(kind: CueKind): 'music' | 'sfx' {
  return MUSIC.has(kind) ? 'music' : 'sfx';
}

export class Score {
  readonly cues: Cue[] = [];

  constructor(
    readonly bpm: number,
    readonly duration: number,
  ) {}

  /** One beat in ms. At 120bpm a beat is 500ms, a bar 2000ms. */
  get beat(): number {
    return 60000 / this.bpm;
  }

  get bar(): number {
    return this.beat * 4;
  }

  add(cue: Cue): this {
    if (cue.at >= 0 && cue.at < this.duration) this.cues.push(cue);
    return this;
  }

  /** A pass of air timed to a colorWipe. Pan follows the sweep. */
  whoosh(at: number, len = 560, from: 'left' | 'right' = 'left'): this {
    return this.add({ kind: 'whoosh', at, len, dir: from === 'left' ? 1 : -1 });
  }

  impact(at: number, gain = 1): this {
    return this.add({ kind: 'impact', at, gain });
  }

  /** A short thud under a word that slams onto the beat. */
  hit(at: number): this {
    return this.add({ kind: 'hit', at });
  }

  /** A UI tick for a node, chip, or card landing. */
  tick(at: number, note = 93): this {
    return this.add({ kind: 'tick', at, note });
  }

  riser(at: number, until: number): this {
    return this.add({ kind: 'riser', at, len: until - at });
  }

  /** Kick every beat, clap on 2 and 4, closed hats on the off-8ths. */
  groove(from: number, to: number, { hats = true, claps = true } = {}): this {
    for (let t = from; t < to - 1; t += this.beat) {
      const n = Math.round((t - from) / this.beat);
      this.add({ kind: 'kick', at: t });
      if (claps && n % 2 === 1) this.add({ kind: 'clap', at: t });
      if (hats) this.add({ kind: 'hat', at: t + this.beat / 2, open: n % 4 === 3 });
    }
    return this;
  }

  /**
   * Half-time groove: kick on 1 and the "and" of 2, snare on 3, 16th hats
   * with the off-8ths opened up. Same tempo as groove() but it feels twice
   * as wide — the glossy, slow-motion pocket for product films.
   */
  halftime(from: number, to: number, { hats = true } = {}): this {
    const sixteenth = this.beat / 4;
    for (let t = from; t < to - 1; t += sixteenth) {
      const n = Math.round((t - from) / sixteenth) % 16;
      if (n === 0 || n === 6 || n === 10) this.add({ kind: 'kick', at: t, gain: n ? 0.8 : 1 });
      if (n === 8) this.add({ kind: 'snare', at: t, gain: 1 }).add({ kind: 'clap', at: t });
      if (hats) this.add({ kind: 'hat', at: t, open: n % 4 === 2 && n !== 2 });
    }
    return this;
  }

  /** Kicks only, every beat — the pulse that rebuilds after a breakdown. */
  pulse(from: number, to: number, gain = 0.8): this {
    for (let t = from; t < to - 1; t += this.beat) this.add({ kind: 'kick', at: t, gain });
    return this;
  }

  /** Snare roll that tightens from 8ths to 16ths and swells into `to`. */
  roll(from: number, to: number): this {
    const half = from + (to - from) / 2;
    for (let t = from; t < to - 1; t += t < half ? this.beat / 2 : this.beat / 4) {
      const p = (t - from) / (to - from);
      this.add({ kind: 'snare', at: t, gain: 0.25 + p * 0.75 });
    }
    return this;
  }

  /**
   * Root on every 8th, octave on the off-beat. `chords` is one chord per
   * bar, cycled from absolute song time so harmony never drifts between
   * sections; the root is the chord's lowest note two octaves down.
   */
  bassline(from: number, to: number, chords: number[][]): this {
    const step = this.beat / 2;
    for (let t = from; t < to - 1; t += step) {
      const root = (chordAt(chords, t, this.bar)[0] ?? 57) - 24;
      const off = Math.round((t - from) / step) % 2 === 1;
      this.add({ kind: 'bass', at: t, note: off ? root + 12 : root, len: step * 0.9 });
    }
    return this;
  }

  pads(from: number, to: number, chords: number[][]): this {
    const first = Math.floor(from / this.bar);
    for (let i = first; i * this.bar < to; i += 1) {
      const at = Math.max(from, i * this.bar);
      const end = Math.min(to, (i + 1) * this.bar);
      if (end - at < 40) continue;
      this.add({ kind: 'pad', at, notes: chordAt(chords, at, this.bar), len: end - at });
    }
    return this;
  }

  /** Supersaw chord stabs on the off-beat 8ths — the house-pop pulse. */
  stabs(from: number, to: number, chords: number[][], gain = 1): this {
    for (let t = from + this.beat / 2; t < to - 1; t += this.beat) {
      const notes = chordAt(chords, t, this.bar).map((n) => n + 12);
      this.add({ kind: 'stab', at: t, notes, len: this.beat * 0.36, gain });
    }
    return this;
  }

  /** The vocal-chop hook, cycled every two bars from absolute song time. */
  hook(from: number, to: number, { gain = 1 } = {}): this {
    const first = Math.floor(from / this.bar);
    for (let bar = first; bar * this.bar < to; bar += 1) {
      for (const [beat, note, vowel, len] of HOOK[bar % HOOK.length] ?? []) {
        const at = bar * this.bar + beat * this.beat;
        if (at < from || at >= to) continue;
        this.add({ kind: 'vox', at, note, vowel, len: len * this.beat, gain });
      }
    }
    return this;
  }

  /** A soft keyboard click, one per typed character. */
  key(at: number): this {
    return this.add({ kind: 'key', at });
  }

  /** A bubbly pop for an object landing — pitched so a run of them climbs. */
  pop(at: number, note = 84): this {
    return this.add({ kind: 'pop', at, note });
  }

  /** A quick rising shimmer — glass chimes over a reveal. */
  sparkle(at: number, from: 'left' | 'right' = 'left'): this {
    return this.add({ kind: 'sparkle', at, dir: from === 'left' ? 1 : -1 });
  }

  /** A sub-bass drop you feel more than hear, under the biggest moments. */
  subdrop(at: number): this {
    return this.add({ kind: 'subdrop', at });
  }

  /** A crowd "hey!" — put it on the last off-beat before a drop. */
  shout(at: number): this {
    return this.add({ kind: 'shout', at });
  }

  /** 16th-note arpeggio up the chord and its octave, panned left-right. */
  arp(from: number, to: number, chords: number[][], div = 4): this {
    const step = this.beat / div;
    let n = 0;
    for (let t = from; t < to - 1; t += step, n += 1) {
      const chord = chordAt(chords, t, this.bar);
      const tones = [...chord, ...chord.map((x) => x + 12)];
      const note = tones[n % tones.length] ?? 69;
      this.add({ kind: 'pluck', at: t, note, pan: n % 2 === 0 ? -0.35 : 0.35 });
    }
    return this;
  }
}

function chordAt(chords: number[][], t: number, bar: number): number[] {
  return chords[Math.floor(t / bar) % chords.length] ?? [57, 60, 64];
}

export function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * Why: OfflineAudioContext renders faster than real time and the same cues
 * with the same seed always give the same samples, so a re-export is the
 * same file and the preview is the export.
 */
export async function renderScore(
  score: Score,
  {
    sampleRate = 48000,
    track,
    trackGain = 1,
  }: { sampleRate?: number; track?: AudioBuffer; trackGain?: number } = {},
): Promise<AudioBuffer> {
  const seconds = score.duration / 1000;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const rig = buildRig(ctx, seconds);
  const kinds = track ? (k: CueKind) => layerOf(k) === 'sfx' : () => true;

  if (track) {
    const src = ctx.createBufferSource();
    src.buffer = track;
    const g = ctx.createGain();
    g.gain.value = trackGain;
    src.connect(g).connect(rig.bed);
    src.start(0);
  }

  const kicks = score.cues
    .filter((c) => c.kind === 'kick' && kinds('kick'))
    .map((c) => c.at / 1000)
    .sort((a, b) => a - b);
  pump(rig.duck.gain, kicks);

  for (const cue of score.cues) {
    if (!kinds(cue.kind)) continue;
    play(ctx, rig, cue);
  }
  return ctx.startRendering();
}

type Rig = {
  noise: AudioBuffer;
  /** Soft-clip for the kick: tanh saturation is where the punch comes from. */
  drive: WaveShaperNode;
  duck: GainNode;
  drums: GainNode;
  sfx: GainNode;
  bed: GainNode;
  verb: GainNode;
};

function buildRig(ctx: BaseAudioContext, seconds: number): Rig {
  const rand = seeded(0xed6a2e);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i += 1) nd[i] = rand() * 2 - 1;

  const ir = ctx.createBuffer(2, Math.floor(ctx.sampleRate * 2.6), ctx.sampleRate);
  for (let c = 0; c < 2; c += 1) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i += 1) {
      const p = i / d.length;
      d[i] = (rand() * 2 - 1) * (1 - p) ** 3.2 * (i < 400 ? i / 400 : 1);
    }
  }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 8;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, 0);
  master.gain.linearRampToValueAtTime(0.9, 0.01);
  master.gain.setValueAtTime(0.9, Math.max(0.02, seconds - 0.9));
  master.gain.linearRampToValueAtTime(0, seconds);
  comp.connect(master).connect(ctx.destination);

  const mix = (gain: number) => {
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(comp);
    return g;
  };
  const duck = mix(1);
  const drums = mix(1);
  const sfx = mix(1);
  const bed = mix(1);

  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const ret = mix(0.32);
  conv.connect(ret);
  const verb = ctx.createGain();
  verb.connect(conv);

  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.4 * x) / Math.tanh(2.4);
  }
  drive.curve = curve;
  drive.oversample = '4x';

  return { noise, drive, duck, drums, sfx, bed, verb };
}

/** Sidechain feel: pads and bass breathe out of the way of every kick. */
function pump(param: AudioParam, kicks: number[]): void {
  param.setValueAtTime(1, 0);
  for (const t of kicks) {
    param.setValueAtTime(1, Math.max(0, t - 0.002));
    param.linearRampToValueAtTime(0.38, t + 0.012);
    param.linearRampToValueAtTime(1, t + 0.24);
  }
}

function env(ctx: BaseAudioContext, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function noiseSrc(ctx: BaseAudioContext, rig: Rig, t: number, len: number, offset = 0) {
  const src = ctx.createBufferSource();
  src.buffer = rig.noise;
  src.loop = true;
  src.start(t, offset % 1.9);
  src.stop(t + len);
  return src;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function send(ctx: BaseAudioContext, from: AudioNode, rig: Rig, amount: number): void {
  const g = ctx.createGain();
  g.gain.value = amount;
  from.connect(g).connect(rig.verb);
}

function play(ctx: BaseAudioContext, rig: Rig, cue: Cue): void {
  const t = cue.at / 1000;
  switch (cue.kind) {
    case 'kick': {
      const gain = cue.gain ?? 1;
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(155, t);
      osc.frequency.exponentialRampToValueAtTime(46, t + 0.12);
      osc
        .connect(env(ctx, t, 0.95 * gain, 0.003, 0.46))
        .connect(rig.drive)
        .connect(rig.drums);
      osc.start(t);
      osc.stop(t + 0.52);
      noiseSrc(ctx, rig, t, 0.03, t)
        .connect(filter(ctx, 'highpass', 2600))
        .connect(env(ctx, t, 0.22 * gain, 0.001, 0.016))
        .connect(rig.drums);
      return;
    }
    case 'clap': {
      const bp = filter(ctx, 'bandpass', 1250, 0.9);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      for (const o of [0, 0.011, 0.022]) {
        g.gain.setValueAtTime(0.5, t + o);
        g.gain.exponentialRampToValueAtTime(0.05, t + o + 0.009);
      }
      g.gain.setValueAtTime(0.42, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      noiseSrc(ctx, rig, t, 0.25, t * 1.3)
        .connect(bp)
        .connect(g)
        .connect(rig.drums);
      send(ctx, g, rig, 0.35);
      return;
    }
    case 'hat': {
      const pan = ctx.createStereoPanner();
      pan.pan.value = 0.22;
      const decay = cue.open ? 0.2 : 0.034;
      noiseSrc(ctx, rig, t, decay + 0.02, t * 0.7)
        .connect(filter(ctx, 'highpass', 8200))
        .connect(env(ctx, t, cue.open ? 0.12 : 0.16, 0.001, decay))
        .connect(pan)
        .connect(rig.drums);
      return;
    }
    case 'snare': {
      const gain = cue.gain ?? 1;
      const out = env(ctx, t, 0.38 * gain, 0.001, 0.12);
      noiseSrc(ctx, rig, t, 0.15, t * 0.9)
        .connect(filter(ctx, 'bandpass', 1900, 0.8))
        .connect(out)
        .connect(rig.drums);
      send(ctx, out, rig, 0.25);
      const body = ctx.createOscillator();
      body.type = 'triangle';
      body.frequency.value = 190;
      body.connect(env(ctx, t, 0.22 * gain, 0.001, 0.07)).connect(rig.drums);
      body.start(t);
      body.stop(t + 0.1);
      return;
    }
    case 'bass': {
      const len = cue.len / 1000;
      const f = midi(cue.note);
      const lp = filter(ctx, 'lowpass', 700, 3.5);
      lp.frequency.setValueAtTime(900, t);
      lp.frequency.exponentialRampToValueAtTime(200, t + len);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(0.3, t + 0.006);
      out.gain.setValueAtTime(0.3, t + len * 0.7);
      out.gain.exponentialRampToValueAtTime(0.0001, t + len);
      lp.connect(out).connect(rig.duck);
      for (const [type, mult] of [
        ['sawtooth', 1],
        ['sine', 0.5],
      ] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = f * mult;
        osc.connect(lp);
        osc.start(t);
        osc.stop(t + len + 0.02);
      }
      return;
    }
    case 'pad': {
      const len = cue.len / 1000;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(1, t + Math.min(0.45, len * 0.3));
      out.gain.setValueAtTime(1, t + len * 0.8);
      out.gain.linearRampToValueAtTime(0.0001, t + len + 0.6);
      const lp = filter(ctx, 'lowpass', 1500, 0.6);
      lp.connect(out).connect(rig.duck);
      send(ctx, out, rig, 0.55);
      for (const note of cue.notes) {
        for (const cents of [-9, 9]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = midi(note);
          osc.detune.value = cents;
          const g = ctx.createGain();
          g.gain.value = 0.034;
          osc.connect(g).connect(lp);
          osc.start(t);
          osc.stop(t + len + 0.7);
        }
      }
      return;
    }
    case 'pluck': {
      const f = midi(cue.note);
      const lp = filter(ctx, 'lowpass', 4200, 2);
      lp.frequency.setValueAtTime(4800, t);
      lp.frequency.exponentialRampToValueAtTime(650, t + 0.18);
      const out = env(ctx, t, 0.085, 0.002, 0.3);
      const pan = ctx.createStereoPanner();
      pan.pan.value = cue.pan ?? 0;
      lp.connect(out).connect(pan).connect(rig.duck);
      send(ctx, pan, rig, 0.4);
      for (const type of ['square', 'triangle'] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = type === 'square' ? f : f * 2;
        osc.connect(lp);
        osc.start(t);
        osc.stop(t + 0.34);
      }
      return;
    }
    case 'riser': {
      const len = cue.len / 1000;
      const bp = filter(ctx, 'bandpass', 400, 1.4);
      bp.frequency.setValueAtTime(380, t);
      bp.frequency.exponentialRampToValueAtTime(7200, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.34, t + len);
      g.gain.linearRampToValueAtTime(0.0001, t + len + 0.02);
      noiseSrc(ctx, rig, t, len + 0.03, t)
        .connect(bp)
        .connect(g)
        .connect(rig.sfx);
      send(ctx, g, rig, 0.3);
      const saw = ctx.createOscillator();
      saw.type = 'sawtooth';
      saw.frequency.setValueAtTime(110, t);
      saw.frequency.exponentialRampToValueAtTime(880, t + len);
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.exponentialRampToValueAtTime(0.045, t + len);
      sg.gain.linearRampToValueAtTime(0.0001, t + len + 0.02);
      saw
        .connect(filter(ctx, 'lowpass', 3200))
        .connect(sg)
        .connect(rig.sfx);
      saw.start(t);
      saw.stop(t + len + 0.03);
      return;
    }
    case 'whoosh': {
      const len = cue.len / 1000;
      const peak = t + len * 0.55;
      const bp = filter(ctx, 'bandpass', 300, 0.9);
      bp.frequency.setValueAtTime(320, t);
      bp.frequency.exponentialRampToValueAtTime(2700, peak);
      bp.frequency.exponentialRampToValueAtTime(520, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, peak);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.75 * cue.dir, t);
      pan.pan.linearRampToValueAtTime(0.75 * cue.dir, t + len);
      noiseSrc(ctx, rig, t, len + 0.02, t * 1.1)
        .connect(bp)
        .connect(g)
        .connect(pan);
      pan.connect(rig.sfx);
      send(ctx, pan, rig, 0.22);
      return;
    }
    case 'impact': {
      const gain = cue.gain ?? 1;
      const boom = ctx.createOscillator();
      boom.frequency.setValueAtTime(78, t);
      boom.frequency.exponentialRampToValueAtTime(30, t + 1.1);
      const bg = env(ctx, t, 0.9 * gain, 0.004, 1.5);
      boom.connect(bg).connect(rig.sfx);
      boom.start(t);
      boom.stop(t + 1.6);
      const crack = env(ctx, t, 0.5 * gain, 0.001, 0.6);
      noiseSrc(ctx, rig, t, 0.7, t * 0.5)
        .connect(filter(ctx, 'lowpass', 1100))
        .connect(crack)
        .connect(rig.sfx);
      send(ctx, crack, rig, 0.7);
      send(ctx, bg, rig, 0.25);
      return;
    }
    case 'hit': {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(128, t);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.16);
      osc.connect(env(ctx, t, 0.5, 0.002, 0.24)).connect(rig.sfx);
      osc.start(t);
      osc.stop(t + 0.3);
      const click = env(ctx, t, 0.16, 0.001, 0.02);
      noiseSrc(ctx, rig, t, 0.04, t * 0.3)
        .connect(filter(ctx, 'highpass', 3200))
        .connect(click)
        .connect(rig.sfx);
      send(ctx, click, rig, 0.2);
      return;
    }
    case 'stab': {
      const len = cue.len / 1000;
      const lp = filter(ctx, 'lowpass', 6000, 1.2);
      lp.frequency.setValueAtTime(7000, t);
      lp.frequency.exponentialRampToValueAtTime(1300, t + len + 0.1);
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(cue.gain ?? 1, t + 0.004);
      out.gain.setValueAtTime(cue.gain ?? 1, t + len * 0.6);
      out.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.12);
      lp.connect(out).connect(rig.duck);
      send(ctx, out, rig, 0.35);
      cue.notes.forEach((note, n) => {
        for (const cents of [-18, -9, 0, 9, 18]) {
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = midi(note);
          osc.detune.value = cents + n * 0.7;
          const pan = ctx.createStereoPanner();
          pan.pan.value = cents / 30;
          const g = ctx.createGain();
          g.gain.value = 0.016;
          osc.connect(g).connect(pan).connect(lp);
          osc.start(t);
          osc.stop(t + len + 0.15);
        }
      });
      return;
    }
    case 'vox': {
      voice(ctx, rig, t, cue.len / 1000, midi(cue.note), cue.vowel, 0.32 * (cue.gain ?? 1), 0);
      return;
    }
    case 'shout': {
      // Three voices a little apart in pitch, time and space read as a crowd.
      [
        [196, -0.5, 0],
        [233, 0.45, 0.012],
        [262, 0, 0.022],
      ].forEach(([f, pan, dt]) => {
        voice(ctx, rig, t + (dt as number), 0.26, f as number, 'eh', 0.3, pan as number, true);
      });
      return;
    }
    case 'key': {
      // Two layers: a bright plastic tick and a tiny body thump. The noise
      // offset follows time so no two keys sound identical.
      const click = env(ctx, t, 0.16, 0.001, 0.022);
      noiseSrc(ctx, rig, t, 0.04, t * 3.1)
        .connect(filter(ctx, 'bandpass', 3400 + ((t * 977) % 900), 1.4))
        .connect(click)
        .connect(rig.sfx);
      const body = ctx.createOscillator();
      body.frequency.setValueAtTime(520, t);
      body.frequency.exponentialRampToValueAtTime(240, t + 0.03);
      body.connect(env(ctx, t, 0.07, 0.001, 0.035)).connect(rig.sfx);
      body.start(t);
      body.stop(t + 0.05);
      send(ctx, click, rig, 0.12);
      return;
    }
    case 'pop': {
      const f = midi(cue.note ?? 84);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * 0.5, t);
      osc.frequency.exponentialRampToValueAtTime(f, t + 0.035);
      osc.frequency.exponentialRampToValueAtTime(f * 0.92, t + 0.14);
      const g = env(ctx, t, 0.2, 0.002, 0.13);
      osc.connect(g).connect(rig.sfx);
      send(ctx, g, rig, 0.35);
      osc.start(t);
      osc.stop(t + 0.18);
      return;
    }
    case 'sparkle': {
      const notes = [84, 88, 91, 96, 100, 103];
      notes.forEach((n, i) => {
        const at = t + i * 0.034;
        const pan = ctx.createStereoPanner();
        pan.pan.value = (cue.dir ?? 1) * (-0.7 + (i / (notes.length - 1)) * 1.4);
        for (const [type, mult, gain] of [
          ['sine', 1, 0.07],
          ['triangle', 2.01, 0.025],
        ] as const) {
          const osc = ctx.createOscillator();
          osc.type = type;
          osc.frequency.value = midi(n) * mult;
          const g = env(ctx, at, gain, 0.002, 0.5);
          osc.connect(g).connect(pan);
          osc.start(at);
          osc.stop(at + 0.55);
        }
        pan.connect(rig.sfx);
        send(ctx, pan, rig, 0.6);
      });
      return;
    }
    case 'subdrop': {
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 1.1);
      osc.connect(env(ctx, t, 0.7, 0.01, 1.2)).connect(rig.sfx);
      osc.start(t);
      osc.stop(t + 1.3);
      return;
    }
    case 'tick': {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = midi(cue.note ?? 93);
      const g = env(ctx, t, 0.11, 0.001, 0.07);
      osc.connect(g).connect(rig.sfx);
      send(ctx, g, rig, 0.3);
      osc.start(t);
      osc.stop(t + 0.1);
      return;
    }
  }
}

/**
 * A sung syllable: a saw with breath noise, scooped up into pitch, given
 * vibrato once it holds, and shaped by the vowel's three formants. `shout`
 * falls in pitch and is breathier, like a "hey!".
 */
function voice(
  ctx: BaseAudioContext,
  rig: Rig,
  t: number,
  len: number,
  freq: number,
  vowel: Vowel,
  gain: number,
  pan: number,
  shout = false,
): void {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  if (shout) {
    osc.frequency.setValueAtTime(freq * 1.12, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.82, t + len);
  } else {
    osc.frequency.setValueAtTime(freq * 0.965, t);
    osc.frequency.exponentialRampToValueAtTime(freq, t + 0.06);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.6;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(freq * 0.007, t + Math.max(0.12, len * 0.6));
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + len + 0.1);
  }
  const src = ctx.createGain();
  osc.connect(src);
  const breath = ctx.createGain();
  breath.gain.value = shout ? 0.5 : 0.08;
  noiseSrc(ctx, rig, t, len + 0.1, t * 1.7)
    .connect(breath)
    .connect(src);

  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.linearRampToValueAtTime(gain, t + (shout ? 0.006 : 0.018));
  out.gain.setValueAtTime(gain, t + len * (shout ? 0.3 : 0.75));
  out.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.06);
  FORMANTS[vowel].forEach((f, i) => {
    const bp = filter(ctx, 'bandpass', f, 9 + i * 3);
    const g = ctx.createGain();
    g.gain.value = [1.6, 0.9, 0.45][i] as number;
    src.connect(bp).connect(g).connect(out);
  });
  const p = ctx.createStereoPanner();
  p.pan.value = pan;
  out.connect(p).connect(rig.duck);
  send(ctx, p, rig, shout ? 0.5 : 0.42);
  osc.start(t);
  osc.stop(t + len + 0.1);
}

/** 16-bit PCM WAV. ffmpeg muxes it; nothing else needs to read it. */
export function encodeWav(buffer: AudioBuffer): ArrayBuffer {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const bytes = frames * channels * 2;
  const out = new ArrayBuffer(44 + bytes);
  const v = new DataView(out);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + bytes, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * channels * 2, true);
  v.setUint16(32, channels * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, bytes, true);
  const data = Array.from({ length: channels }, (_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const s = Math.max(-1, Math.min(1, data[c]?.[i] ?? 0));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}
