import { catalog } from './assets';
import { Score, encodeWav, renderScore } from './score';

export type MusicSpec = {
  /** Asset slot of a licensed track, e.g. 'music/launch'. Optional. */
  slot: string;
  gain?: number;
  /** Start reading the track this many ms in, to land its drop on a cut. */
  offset?: number;
};

/**
 * Why: the editor clock is wall-clock and seekable; audio has to follow it
 * rather than run free, or the first scrub leaves the whoosh a second away
 * from its wipe. The mix is rendered once offline and re-cued from the
 * playhead on every play, seek, and loop.
 */
export class Soundtrack {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private out: GainNode | null = null;
  private mix: Promise<AudioBuffer> | null = null;
  muted = false;

  constructor(
    private readonly compose: (s: Score) => void,
    private readonly bpm: number,
    private readonly duration: number,
    private readonly music?: MusicSpec,
  ) {}

  /** The finished stereo mix. Rendered once, shared by preview and export. */
  render(): Promise<AudioBuffer> {
    if (!this.mix) this.mix = this.build();
    return this.mix;
  }

  async wavBase64(): Promise<string> {
    const wav = new Uint8Array(encodeWav(await this.render()));
    let bin = '';
    for (let i = 0; i < wav.length; i += 0x8000) {
      bin += String.fromCharCode(...wav.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  /** Browsers start audio suspended until a gesture; call from one. */
  unlock(): void {
    void this.context().resume();
  }

  play(fromMs: number): void {
    this.stop();
    if (this.muted) return;
    const ctx = this.context();
    void this.render().then((buffer) => {
      if (this.muted) return;
      this.stop();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(this.out!);
      const at = Math.max(0, Math.min(buffer.duration, fromMs / 1000));
      src.start(ctx.currentTime + 0.005, at);
      this.source = src;
    });
  }

  stop(): void {
    try {
      this.source?.stop();
    } catch {
      // Already stopped.
    }
    this.source?.disconnect();
    this.source = null;
  }

  private context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: 48000 });
      this.out = this.ctx.createGain();
      this.out.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private async build(): Promise<AudioBuffer> {
    const score = new Score(this.bpm, this.duration);
    this.compose(score);
    const track = this.music ? await loadTrack(this.music) : undefined;
    return renderScore(score, { track, trackGain: this.music?.gain ?? 1 });
  }
}

/**
 * Why: a missing licensed track must not break the film. Without the file
 * the synthesized score plays in full, so the scene is never silent.
 */
async function loadTrack(spec: MusicSpec): Promise<AudioBuffer | undefined> {
  const item = catalog.get(spec.slot);
  if (!item || item.kind !== 'audio') return undefined;
  const bytes = await (await fetch(item.url)).arrayBuffer();
  const decoder = new OfflineAudioContext(2, 1, 48000);
  const full = await decoder.decodeAudioData(bytes);
  const skip = Math.floor(((spec.offset ?? 0) / 1000) * full.sampleRate);
  if (skip <= 0) return full;
  const cut = new AudioBuffer({
    numberOfChannels: full.numberOfChannels,
    length: Math.max(1, full.length - skip),
    sampleRate: full.sampleRate,
  });
  for (let c = 0; c < full.numberOfChannels; c += 1) {
    cut.copyToChannel(full.getChannelData(c).subarray(skip), c);
  }
  return cut;
}
