import { listSlots, type SlotRow } from './lib/assets';
import { applyExportProgress, requestExport } from './lib/export';
import { icons } from './lib/icons';
import { formatBytes, formatDuration, type ClipFormat, type SceneMeta } from './lib/scene-meta';

type Clip = {
  name: string;
  bytes: number;
  mtime: string;
  scene: string;
};

type FrameFilter = 'all' | 'wide' | 'tall';

const $ = <T extends Element>(sel: string) => document.querySelector(sel) as T | null;

const scenesEl = $<HTMLElement>('#scenes');
const assetsEl = $<HTMLElement>('#assets');
const assetsCount = $<HTMLElement>('#assets-count');
const clipsEl = $<HTMLElement>('#clips');
const statusEl = $<HTMLElement>('#status');
const summaryEl = $<HTMLElement>('#summary');
const reviewScope = $<HTMLElement>('#review-scope');
const reviewStage = $<HTMLButtonElement>('#review-stage');
const reviewFilm = $<HTMLVideoElement>('#review-film');
const reviewName = $<HTMLElement>('#review-name');
const reviewInfo = $<HTMLElement>('#review-info');
const clipFilter = $<HTMLButtonElement>('#clip-filter');
const search = $<HTMLInputElement>('#search');
const viewer = $<HTMLElement>('#viewer');
const player = $<HTMLVideoElement>('#player');
const viewerName = $<HTMLElement>('#viewer-name');

const searchIcon = $<HTMLElement>('#search-icon');
if (searchIcon) searchIcon.outerHTML = icons.search;
const viewerClose = $<HTMLElement>('#viewer-close');
if (viewerClose) viewerClose.innerHTML = icons.close;

const fallbackScenes = Object.keys(import.meta.glob('./scenes/*/scene.ts'))
  .map((path) => path.split('/')[2] ?? '')
  .filter((name) => name && !name.startsWith('_'))
  .sort()
  .map((id) => {
    const [number, ...rest] = id.split('-');
    return {
      id,
      number: number ?? id,
      title: rest.join(' '),
      width: 1920,
      height: 1080,
      duration: 0,
    } satisfies SceneMeta;
  });

const FILTER_KEY = 'edgaze.dashboard.filter';

let scenes: SceneMeta[] = [];
let clips: Clip[] = [];
let selected: string | null = null;
let pendingDelete: string | null = null;
let live = true;
let query = '';
let frame: FrameFilter = readFilter();

function readFilter(): FrameFilter {
  try {
    const value = localStorage.getItem(FILTER_KEY);
    return value === 'wide' || value === 'tall' ? value : 'all';
  } catch {
    return 'all';
  }
}

const esc = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[ch] ?? ch,
  );

const prettyTitle = (title: string) =>
  title ? title.charAt(0).toUpperCase() + title.slice(1) : 'Untitled';

const isTall = (scene: SceneMeta) => scene.height > scene.width;

const ago = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** "3 min ago", "yesterday", or a date once it is more than a week old. */
const formatWhen = (iso: string, now = Date.now()) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const s = (date.getTime() - now) / 1000;
  const abs = Math.abs(s);
  if (abs < 45) return 'just now';
  if (abs < 3600) return ago.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return ago.format(Math.round(s / 3600), 'hour');
  if (abs < 7 * 86400) return ago.format(Math.round(s / 86400), 'day');
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
};

/**
 * The server guesses a clip's scene from its name and can miss on suffixes
 * like -1080p; the scene list is the authority, longest id first.
 */
const sceneOf = (clip: Clip) =>
  [...scenes]
    .sort((a, b) => b.id.length - a.id.length)
    .find((scene) => clip.name.startsWith(`${scene.id}-`) || clip.name === scene.id)?.id ??
  clip.scene;

const sceneTitle = (id: string) => {
  const scene = scenes.find((item) => item.id === id);
  return scene ? `${scene.number} ${prettyTitle(scene.title)}` : id;
};

const clipsFor = (sceneId: string | null) =>
  sceneId ? clips.filter((clip) => sceneOf(clip) === sceneId) : clips;

const latestFor = (sceneId: string | null) => {
  const list = clipsFor(sceneId);
  return list.find((clip) => clip.bytes > 2048) ?? list[0];
};

let toastTimer = 0;
const statusText = (message: string, ms = 3200) => {
  if (!statusEl) return;
  statusEl.textContent = message;
  if (toastTimer) window.clearTimeout(toastTimer);
  if (message) toastTimer = window.setTimeout(() => (statusEl.textContent = ''), ms);
};

async function loadScenes(): Promise<SceneMeta[]> {
  try {
    const response = await fetch('/api/scenes');
    if (!response.ok) throw new Error('no api');
    live = true;
    return (await response.json()) as SceneMeta[];
  } catch {
    live = false;
    return fallbackScenes;
  }
}

async function loadClips(): Promise<Clip[]> {
  try {
    const response = await fetch('/api/recordings');
    if (!response.ok) throw new Error('no api');
    const list = (await response.json()) as Clip[];
    return list.sort((a, b) => b.mtime.localeCompare(a.mtime));
  } catch {
    return [];
  }
}

function visibleScenes(): SceneMeta[] {
  const q = query.trim().toLowerCase();
  return scenes.filter((scene) => {
    if (frame === 'wide' && isTall(scene)) return false;
    if (frame === 'tall' && !isTall(scene)) return false;
    if (!q) return true;
    return `${scene.number} ${scene.title} ${scene.id}`.toLowerCase().includes(q);
  });
}

function sceneRow(scene: SceneMeta): string {
  const last = latestFor(scene.id);
  const on = selected === scene.id;
  const meta = [
    `${scene.width}×${scene.height}`,
    formatDuration(scene.duration),
    last ? `exported ${formatWhen(last.mtime)}` : 'not exported',
  ];
  return `<li class="scene" role="option" tabindex="${on ? 0 : -1}" data-scene="${esc(scene.id)}" aria-selected="${on}">
    <span class="frame${isTall(scene) ? ' tall' : ''}" aria-hidden="true"><i></i></span>
    <span class="scene-text">
      <span class="scene-name"><span class="num">${esc(scene.number)}</span><span class="title">${esc(prettyTitle(scene.title))}</span></span>
      <span class="scene-meta">${esc(meta.join(' · '))}</span>
    </span>
    <span class="acts">
      <button type="button" class="btn" data-export="mp4" title="Export H.264 + AAC">${icons.download}MP4</button>
      <button type="button" class="btn" data-export="mov" title="Export ProRes master">MOV</button>
      <a class="btn primary" href="./scenes/${esc(scene.id)}/index.html">Open</a>
    </span>
  </li>`;
}

function assetRow(row: SlotRow): string {
  return `<li class="asset" data-state="${esc(row.state)}">
    <b title="${esc(row.id)}">${esc(row.id)}</b>
    <span>${esc(row.kind)} · ${esc(row.state)}</span>
  </li>`;
}

function clipRow(clip: Clip): string {
  const confirm = pendingDelete === clip.name;
  const scene = selected ? '' : `${sceneTitle(sceneOf(clip))} · `;
  return `<li class="clip" data-clip="${esc(clip.name)}">
    <button type="button" class="clip-name" data-play="${esc(clip.name)}" title="Play ${esc(clip.name)}">
      <b>${esc(clip.name)}</b>
      <span>${esc(scene)}${esc(formatBytes(clip.bytes))} · ${esc(formatWhen(clip.mtime))}</span>
    </button>
    <span class="acts">
      <a class="btn icon" href="/api/recordings/${encodeURIComponent(clip.name)}?download=1" download="${esc(clip.name)}" title="Save" aria-label="Save ${esc(clip.name)}">${icons.download}</a>
      <button type="button" class="btn ${confirm ? 'warn' : 'icon'}" data-delete="${esc(clip.name)}" title="${confirm ? 'Click again to delete' : 'Delete'}" aria-label="Delete ${esc(clip.name)}">${confirm ? 'Delete?' : icons.trash}</button>
    </span>
  </li>`;
}

function seekPoster(video: HTMLVideoElement) {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  video.currentTime = Math.min(duration * 0.42, Math.max(duration - 0.08, 0));
}

reviewFilm?.addEventListener('loadedmetadata', () => seekPoster(reviewFilm));
reviewFilm?.addEventListener('error', () => reviewFilm.removeAttribute('src'));

function renderReview() {
  if (!reviewFilm) return;
  const clip = latestFor(selected) ?? (selected ? undefined : clips[0]);
  if (reviewScope) reviewScope.textContent = selected ? sceneTitle(selected) : 'All scenes';
  if (!clip) {
    if (reviewFilm.hasAttribute('src')) {
      reviewFilm.removeAttribute('src');
      reviewFilm.load();
    }
    if (reviewName) reviewName.textContent = selected ? 'Nothing exported yet' : '';
    if (reviewInfo) reviewInfo.textContent = selected ? 'Export MP4 from the scene row.' : '';
    return;
  }
  const href = `/api/recordings/${encodeURIComponent(clip.name)}`;
  if (reviewFilm.getAttribute('src') !== href) {
    reviewFilm.src = href;
    reviewFilm.load();
  }
  if (reviewName) reviewName.textContent = clip.name;
  if (reviewInfo)
    reviewInfo.textContent = `${formatBytes(clip.bytes)} · ${formatWhen(clip.mtime)}`;
  reviewStage?.setAttribute('aria-label', `Play ${clip.name}`);
}

function renderSummary(slots: SlotRow[]) {
  if (!summaryEl) return;
  const ready = slots.filter((row) => row.state === 'ready').length;
  const items: [string, string, string?][] = [
    [String(scenes.length), scenes.length === 1 ? 'scene' : 'scenes'],
    [String(clips.length), clips.length === 1 ? 'recording' : 'recordings'],
    [String(ready), ready === 1 ? 'asset' : 'assets'],
    [live ? 'Local server' : 'Preview only', '', live ? 'live' : 'live off'],
  ];
  summaryEl.innerHTML = items
    .map(
      ([value, label, cls]) =>
        `<div${cls ? ` class="${cls}"` : ''}><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`,
    )
    .join('');
}

function renderScenes() {
  if (!scenesEl) return;
  const list = visibleScenes();
  scenesEl.innerHTML =
    list.map(sceneRow).join('') ||
    `<li class="empty">${
      scenes.length
        ? 'No scenes match this filter.'
        : 'No scenes yet. Scaffold one with npm run new 001 first-clip.'
    }</li>`;
  // Keep one row reachable by Tab even when nothing is selected.
  if (!scenesEl.querySelector('[tabindex="0"]')) {
    scenesEl.querySelector('.scene')?.setAttribute('tabindex', '0');
  }
}

function renderClips() {
  if (!clipsEl) return;
  const visible = clipsFor(selected);
  clipsEl.innerHTML =
    visible.map(clipRow).join('') ||
    `<li class="empty">${
      selected
        ? 'No recordings for this scene yet.'
        : 'Nothing in recordings/. Export a scene to write a clip here.'
    }</li>`;
  if (clipFilter) clipFilter.hidden = !selected;
}

function render() {
  renderScenes();
  const slots = listSlots();
  if (assetsEl) assetsEl.innerHTML = slots.map(assetRow).join('');
  if (assetsCount) {
    const ready = slots.filter((row) => row.state === 'ready').length;
    assetsCount.textContent = `${ready} of ${slots.length} ready`;
  }
  renderClips();
  renderSummary(slots);
  renderReview();
}

function paintFilter() {
  document.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.frame === frame));
  });
}

async function refresh() {
  const [nextScenes, nextClips] = await Promise.all([loadScenes(), loadClips()]);
  scenes = nextScenes;
  clips = nextClips;
  if (selected && !scenes.some((scene) => scene.id === selected)) selected = null;
  render();
}

async function exportScene(scene: string, format: ClipFormat) {
  document.body.classList.add('busy');
  applyExportProgress({
    phase: 'queued',
    percent: 0,
    label: `Exporting ${format.toUpperCase()}`,
  });
  try {
    const name = await requestExport(format, {
      scene,
      onStatus: () => undefined,
      onProgress: (progress) => {
        applyExportProgress({
          ...progress,
          label: progress.label || `Exporting ${format.toUpperCase()}`,
        });
      },
    });
    applyExportProgress(null);
    statusText(`Saved ${name}`);
    await refresh();
  } catch (error) {
    applyExportProgress(null);
    statusText(error instanceof Error ? error.message : 'Export failed', 6000);
  } finally {
    document.body.classList.remove('busy');
  }
}

function openViewer(name: string) {
  if (!player || !viewer) return;
  player.src = `/api/recordings/${encodeURIComponent(name)}`;
  if (viewerName) viewerName.textContent = name;
  viewer.hidden = false;
  void player.play();
}

function closeViewer() {
  if (!player || !viewer) return;
  player.pause();
  player.removeAttribute('src');
  player.load();
  viewer.hidden = true;
}

function select(scene: string | null) {
  selected = scene;
  pendingDelete = null;
  render();
  if (scene) {
    scenesEl?.querySelector<HTMLElement>(`[data-scene="${CSS.escape(scene)}"]`)?.focus();
  }
}

scenesEl?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest('button[data-export]');
  if (button) {
    const scene = button.closest('[data-scene]')?.getAttribute('data-scene');
    const format = button.getAttribute('data-export');
    if (!scene || (format !== 'mp4' && format !== 'mov')) return;
    void exportScene(scene, format);
    return;
  }
  if (target?.closest('a')) return;
  const scene = target?.closest('[data-scene]')?.getAttribute('data-scene');
  if (!scene) return;
  select(selected === scene ? null : scene);
});

scenesEl?.addEventListener('dblclick', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest('button, a')) return;
  const scene = target?.closest('[data-scene]')?.getAttribute('data-scene');
  if (scene) location.href = `./scenes/${scene}/index.html`;
});

clipsEl?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const play = target?.closest('[data-play]');
  const remove = target?.closest('[data-delete]');
  if (play) {
    const name = play.getAttribute('data-play');
    pendingDelete = null;
    if (name) openViewer(name);
    return;
  }
  if (remove) {
    const name = remove.getAttribute('data-delete');
    if (!name) return;
    if (pendingDelete !== name) {
      pendingDelete = name;
      renderClips();
      return;
    }
    pendingDelete = null;
    void fetch(`/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(
      refresh,
    );
    return;
  }
  if (pendingDelete) {
    pendingDelete = null;
    renderClips();
  }
});

clipFilter?.addEventListener('click', () => select(null));

reviewStage?.addEventListener('click', () => {
  const clip = latestFor(selected) ?? (selected ? undefined : clips[0]);
  if (clip) openViewer(clip.name);
});

search?.addEventListener('input', () => {
  query = search.value;
  renderScenes();
});

document.querySelectorAll<HTMLButtonElement>('[data-frame]').forEach((button) => {
  button.addEventListener('click', () => {
    frame = (button.dataset.frame as FrameFilter) ?? 'all';
    try {
      localStorage.setItem(FILTER_KEY, frame);
    } catch {
      // Storage blocked; the filter still applies for this visit.
    }
    paintFilter();
    renderScenes();
  });
});

viewerClose?.addEventListener('click', closeViewer);

viewer?.addEventListener('click', (event) => {
  if (event.target === viewer) closeViewer();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (viewer && !viewer.hidden) {
      closeViewer();
      return;
    }
    if (document.activeElement === search && search?.value) {
      search.value = '';
      query = '';
      renderScenes();
      return;
    }
    if (pendingDelete || selected) select(null);
  }
});

paintFilter();
void refresh();
