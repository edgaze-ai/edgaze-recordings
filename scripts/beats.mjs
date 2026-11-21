/**
 * Beat map for a track or a finished clip.
 *
 *   npm run beats -- music/launch              # src/assets/music/launch.*
 *   npm run beats -- path/to/song.mp3
 *   npm run beats -- recordings/010-…mp4      # verify an export's audio
 *   npm run beats -- music/launch --bpm 124    # force tempo if detection is off by an octave
 *
 * Writes <name>.beats.json (scenes import it) and <name>.beats.md (the
 * timeline an agent reads before storyboarding), and prints the timeline.
 * Needs system ffmpeg, which export already requires.
 */
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyze, describe } from '../src/lib/beatgrid.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = ['wav', 'flac', 'm4a', 'mp3', 'aac', 'ogg', 'mp4', 'mov', 'webm'];
const SR = 22050;

const args = process.argv.slice(2).filter((a) => a !== '--');
const target = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

if (!target) {
  console.error('Usage: npm run beats -- music/launch | path/to/file [--bpm 120] [--bars 4]');
  process.exit(1);
}

const file = resolveTrack(target);
const pcm = await decode(file);
const map = analyze(pcm, SR, {
  source: basename(file),
  bpm: flag('bpm') ? Number(flag('bpm')) : undefined,
  beatsPerBar: flag('bars') ? Number(flag('bars')) : 4,
});
const md = describe(map);
const stem = join(dirname(file), basename(file, extname(file)));
await writeFile(`${stem}.beats.json`, JSON.stringify(map, null, 2) + '\n');
await writeFile(`${stem}.beats.md`, md);
process.stdout.write(md);
console.error(`\nwrote ${rel(stem)}.beats.json and .beats.md`);

function resolveTrack(name) {
  const direct = resolve(process.cwd(), name);
  if (existsSync(direct) && AUDIO.includes(extname(direct).slice(1).toLowerCase()))
    return direct;
  const slot = resolve(root, 'src/assets', name);
  const dir = dirname(slot);
  const stem = basename(slot);
  if (existsSync(dir)) {
    const hit = readdirSync(dir)
      .filter((f) => basename(f, extname(f)) === stem)
      .find((f) => AUDIO.includes(extname(f).slice(1).toLowerCase()));
    if (hit) return join(dir, hit);
  }
  console.error(`No audio found for "${name}". Drop it in src/assets/music/ or pass a path.`);
  process.exit(1);
}

function decode(path) {
  return new Promise((resolvePcm, reject) => {
    const ff = spawn(
      'ffmpeg',
      [
        '-v',
        'error',
        '-i',
        path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        String(SR),
        '-f',
        'f32le',
        'pipe:1',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const chunks = [];
    let err = '';
    ff.stdout.on('data', (c) => chunks.push(c));
    ff.stderr.on('data', (c) => (err += c));
    ff.on('error', (e) => reject(e.code === 'ENOENT' ? new Error('ffmpeg is required') : e));
    ff.on('exit', (code) => {
      if (code !== 0) return reject(new Error(err.trim() || 'ffmpeg failed'));
      const buf = Buffer.concat(chunks);
      const out = new Float32Array(buf.length / 4);
      for (let i = 0; i < out.length; i += 1) out[i] = buf.readFloatLE(i * 4);
      if (!out.length) return reject(new Error('No audio stream in ' + rel(path)));
      resolvePcm(out);
    });
  });
}

function rel(p) {
  return p.startsWith(root) ? p.slice(root.length + 1) : p;
}
