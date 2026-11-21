import '../styles/editor.css';
import { type BeatMap } from './beatgrid';
import { icons } from './icons';

/**
 * The editor dock: a toolbar of icon buttons over a full-width timeline.
 * Harness only. It lives in `.chrome`, which `body.rec` hides, so nothing
 * here can reach a frame of an export.
 *
 * Why rebuild the chrome instead of styling scene markup: every scene ships
 * the same legacy `.chrome` block. Replacing it at mount keeps one editor for
 * all sixteen scenes without touching a scene file.
 */
export type EditorRefs = {
  dock: HTMLElement;
  play: HTMLButtonElement;
  toStart: HTMLButtonElement;
  toEnd: HTMLButtonElement;
  frameBack: HTMLButtonElement;
  frameNext: HTMLButtonElement;
  replay: HTMLButtonElement;
  slow: HTMLButtonElement;
  sound: HTMLButtonElement | null;
  rec: HTMLButtonElement;
  mp4: HTMLButtonElement;
  mov: HTMLButtonElement;
  clock: HTMLElement;
  where: HTMLElement;
  rail: HTMLElement;
  lanes: HTMLElement;
  ruler: HTMLElement;
  hover: HTMLElement;
  hoverTime: HTMLElement;
  wave: HTMLCanvasElement | null;
  status: HTMLElement;
};

export type EditorOptions = {
  width: number;
  height: number;
  duration: number;
  hasSound: boolean;
  beats?: BeatMap;
};

const FPS = 60;

const btn = (id: string, icon: string, label: string, extra = '') =>
  `<button type="button" id="${id}" class="ed-btn ${extra}" aria-label="${label}" data-tip="${label}">${icon}</button>`;

export function buildEditor(chrome: HTMLElement, opts: EditorOptions): EditorRefs {
  const title = sceneTitle();
  const aspect = opts.height > opts.width ? '9:16' : '16:9';
  document.documentElement.classList.add('ed');
  chrome.className = 'chrome ed-dock';
  chrome.setAttribute('role', 'region');
  chrome.setAttribute('aria-label', 'Editor');
  chrome.innerHTML = `
    <div class="ed-bar">
      <div class="ed-group ed-left">
        <a class="ed-btn" href="/" aria-label="All scenes" data-tip="All scenes">${icons.back}</a>
        <div class="ed-title">
          <strong>${escapeHtml(title.name)}</strong>
          <span>${opts.width}×${opts.height} · ${aspect} · ${FPS} fps${
            opts.beats ? ` · ${Math.round(opts.beats.bpm)} bpm` : ''
          }</span>
        </div>
      </div>
      <div class="ed-group ed-center">
        ${btn('to-start', icons.toStart, 'Go to start (Home)')}
        ${btn('frame-back', icons.frameBack, 'Previous frame (,)')}
        <button type="button" id="play" class="ed-play" aria-label="Play (Space)" data-tip="Play (Space)">${icons.play}</button>
        ${btn('frame-next', icons.frameNext, 'Next frame (.)')}
        ${btn('to-end', icons.toEnd, 'Go to end (End)')}
        <div class="ed-clock" aria-live="off">
          <span id="clock">0:00.00</span><span class="ed-total">/ ${preciseClock(opts.duration)}</span>
          <span id="ed-where" class="ed-where"></span>
        </div>
      </div>
      <div class="ed-group ed-right">
        ${btn('replay', icons.replay, 'Replay from start (R)')}
        <button type="button" id="slow" class="ed-chip" aria-pressed="false" data-tip="Quarter speed (S)">0.25×</button>
        ${opts.hasSound ? btn('sound', icons.sound, 'Mute preview (M)') : ''}
        <span class="ed-sep" aria-hidden="true"></span>
        ${btn('rec', icons.record, 'Record mode, Esc exits', 'ed-rec')}
        <button type="button" id="export-mp4" class="ed-export" data-tip="Export H.264 + AAC">${icons.download}<span>MP4</span></button>
        <button type="button" id="export-mov" class="ed-export ghost" data-tip="Export ProRes master">MOV</button>
      </div>
    </div>
    <div id="rail" class="ed-time" role="slider" tabindex="0" aria-label="Timeline"
      aria-valuemin="0" aria-valuemax="${opts.duration}" aria-valuenow="0">
      <div class="ed-lanes">
        <div class="ed-ruler"></div>
        ${opts.beats ? '<div class="ed-lane ed-sections" data-lane="Sections"></div><div class="ed-lane ed-bars" data-lane="Bars"></div>' : ''}
        ${opts.hasSound ? '<div class="ed-lane ed-audio" data-lane="Audio"><canvas class="ed-wave"></canvas></div>' : ''}
        <i class="ed-past"></i>
        <i class="ed-hover" hidden><b class="ed-hover-time"></b></i>
        <i class="ed-head"><b></b></i>
      </div>
    </div>
    <div id="xfer" class="xfer" hidden>
      <div class="xfer-meta"><span id="xfer-label"></span><span id="xfer-pct" class="xfer-pct"></span></div>
      <div class="xfer-rail"><i id="xfer-fill"></i></div>
    </div>
    <p id="status" class="ed-status" role="status"></p>`;

  const q = <T extends Element>(sel: string) => chrome.querySelector(sel) as T;
  const rail = q<HTMLElement>('#rail');
  const refs: EditorRefs = {
    dock: chrome,
    play: q('#play'),
    toStart: q('#to-start'),
    toEnd: q('#to-end'),
    frameBack: q('#frame-back'),
    frameNext: q('#frame-next'),
    replay: q('#replay'),
    slow: q('#slow'),
    sound: chrome.querySelector('#sound'),
    rec: q('#rec'),
    mp4: q('#export-mp4'),
    mov: q('#export-mov'),
    clock: q('#clock'),
    where: q('#ed-where'),
    rail,
    lanes: q('.ed-lanes'),
    ruler: q('.ed-ruler'),
    hover: q('.ed-hover'),
    hoverTime: q('.ed-hover-time'),
    wave: chrome.querySelector('.ed-wave'),
    status: q('#status'),
  };

  if (opts.beats) drawBeatLanes(chrome, opts.beats, opts.duration);
  let step = 0;
  const layout = () => {
    const width = refs.lanes.clientWidth;
    const next = rulerStep(opts.duration, width);
    if (next !== step) {
      step = next;
      drawRuler(refs.ruler, opts.duration, step);
    }
  };
  new ResizeObserver(layout).observe(refs.lanes);
  layout();
  return refs;
}

/** Scene name from the document title: "014 — Name · detail" → "014 Name". */
function sceneTitle(): { name: string } {
  const raw = document.title || location.pathname.split('/').at(-2) || 'Scene';
  const [head] = raw.split(' · ');
  return { name: (head ?? raw).replace(/\s+—\s+/, '  ') };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/** m:ss.cc, the precision a cut is judged at. */
export function preciseClock(ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

/** "Bar 7.2" — the bar and beat under the playhead. */
export function whereInBars(map: BeatMap, ms: number): string {
  const downs = map.downbeats;
  if (!downs.length || ms < (downs[0] ?? 0)) return '';
  let lo = 0;
  let hi = downs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((downs[mid] ?? 0) <= ms) lo = mid;
    else hi = mid - 1;
  }
  const beat = Math.floor((ms - (downs[lo] ?? 0)) / map.period) % map.beatsPerBar;
  return `Bar ${lo + 1}.${beat + 1}`;
}

const STEPS = [250, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000];

/** The smallest label interval that keeps labels ~64px apart. */
export function rulerStep(duration: number, width: number): number {
  if (duration <= 0 || width <= 0) return 1000;
  const perPx = duration / width;
  return STEPS.find((s) => s / perPx >= 64) ?? STEPS[STEPS.length - 1]!;
}

function drawRuler(ruler: HTMLElement, duration: number, step: number): void {
  const minor = step / 4;
  const parts: string[] = [];
  for (let t = 0; t <= duration + 0.5; t += minor) {
    const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
    const left = (t / duration) * 100;
    parts.push(
      major
        ? `<i class="major" style="left:${left}%"><span>${rulerLabel(t, step)}</span></i>`
        : `<i style="left:${left}%"></i>`,
    );
  }
  ruler.innerHTML = parts.join('');
}

function rulerLabel(ms: number, step: number): string {
  const s = ms / 1000;
  if (step < 1000) return `${s.toFixed(1)}s`;
  if (s < 60) return `${Math.round(s)}s`;
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}

/** Sections by energy and every bar line, positioned once in %. Never animated. */
function drawBeatLanes(chrome: HTMLElement, map: BeatMap, duration: number): void {
  const sections = chrome.querySelector('.ed-sections');
  const bars = chrome.querySelector('.ed-bars');
  if (!(sections instanceof HTMLElement) || !(bars instanceof HTMLElement) || duration <= 0)
    return;
  const pct = (t: number) => `${Math.min(100, (t / duration) * 100)}%`;

  sections.innerHTML = map.sections
    .filter((s) => s.at < duration)
    .map((s) => {
      const width = (Math.min(s.end, duration) - s.at) / duration;
      const label = s.fromBar === s.toBar ? `${s.fromBar}` : `${s.fromBar}–${s.toBar}`;
      return `<i data-level="${s.level}" style="left:${pct(s.at)};width:${width * 100}%" title="Bars ${label} · ${s.level}"><span>${label}</span></i>`;
    })
    .join('');

  const every = map.downbeats.length > 40 ? 4 : map.downbeats.length > 20 ? 2 : 1;
  bars.innerHTML = map.downbeats
    .map((t, i) => {
      if (t > duration) return '';
      const drop = map.drops.includes(t);
      const label = i % every === 0 || drop ? `<span>${i + 1}</span>` : '';
      return `<i class="${drop ? 'drop' : ''}" style="left:${pct(t)}" title="Bar ${i + 1} · ${Math.round(t)}ms${drop ? ' · drop' : ''}">${label}</i>`;
    })
    .join('');
}

/**
 * The rendered mix as a min/max waveform. Drawn from the same buffer the
 * preview plays and the export muxes, so a hit you see is a hit you hear.
 */
export function drawWave(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  duration: number,
): void {
  const box = canvas.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const styles = getComputedStyle(canvas);
  ctx.fillStyle = styles.getPropertyValue('--ed-wave').trim() || styles.color;
  const data = buffer.getChannelData(0);
  const other = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : data;
  const span = Math.min(buffer.length, Math.floor((duration / 1000) * buffer.sampleRate));
  const cols = canvas.width;
  const mid = canvas.height / 2;
  const per = Math.max(1, Math.floor(span / cols));
  const stride = Math.max(1, Math.floor(per / 64));
  let peak = 0;
  const amps = new Float32Array(cols);
  for (let x = 0; x < cols; x += 1) {
    const from = x * per;
    let max = 0;
    for (let i = from; i < from + per && i < span; i += stride) {
      const v = Math.max(Math.abs(data[i] ?? 0), Math.abs(other[i] ?? 0));
      if (v > max) max = v;
    }
    amps[x] = max;
    if (max > peak) peak = max;
  }
  const norm = peak > 0 ? 1 / peak : 1;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let x = 0; x < cols; x += 1) {
    const h = Math.max(dpr, (amps[x] ?? 0) * norm * (mid - dpr));
    ctx.fillRect(x, mid - h, 1, h * 2);
  }
}

// ─── preferences that survive reloads ───────────────────────────────────

const MUTE_KEY = 'edgaze.editor.muted';
const SESSION_KEY = 'edgaze.editor.session.';

/** Preview mute only. Exports render the mix offline and always carry it. */
export const prefs = {
  get muted(): boolean {
    try {
      return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      return false;
    }
  },
  set muted(on: boolean) {
    try {
      localStorage.setItem(MUTE_KEY, on ? '1' : '0');
    } catch {
      // Storage blocked; the toggle still works for this page.
    }
  },
};

export type EditorSession = { time: number; playing: boolean; slow: boolean; at: number };

/** Where the playhead was, so a reload mid-edit resumes instead of restarting. */
export function loadSession(scene: string): EditorSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY + scene);
    if (!raw) return null;
    const value = JSON.parse(raw) as EditorSession;
    // A session older than ten minutes is a new visit, not a reload.
    if (!Number.isFinite(value.time) || Date.now() - value.at > 600_000) return null;
    return value;
  } catch {
    return null;
  }
}

export function saveSession(scene: string, value: Omit<EditorSession, 'at'>): void {
  try {
    sessionStorage.setItem(SESSION_KEY + scene, JSON.stringify({ ...value, at: Date.now() }));
  } catch {
    // Storage blocked; reload restarts from zero as before.
  }
}
