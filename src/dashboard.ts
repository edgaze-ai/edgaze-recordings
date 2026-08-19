import { listSlots, type SlotRow } from './lib/assets';
import { applyExportProgress, requestExport } from './lib/export';
import { formatBytes, formatDuration, type ClipFormat, type SceneMeta } from './lib/scene-meta';

type Clip = {
  name: string;
  bytes: number;
  mtime: string;
  scene: string;
};

const scenesEl = document.querySelector('#scenes');
const assetsEl = document.querySelector('#assets');
const clipsEl = document.querySelector('#clips');
const statusEl = document.querySelector('#status');
const summaryEl = document.querySelector('#summary');
const reviewEl = document.querySelector('#review');
const reviewFilm = document.querySelector('#review-film');
const reviewName = document.querySelector('#review-name');
const reviewInfo = document.querySelector('#review-info');
const clipFilter = document.querySelector('#clip-filter');
const viewer = document.querySelector('#viewer');
const player = document.querySelector('#player');
const viewerName = document.querySelector('#viewer-name');

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

let scenes: SceneMeta[] = [];
let clips: Clip[] = [];
let selected: string | null = null;
let pendingDelete: string | null = null;
let live = true;

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

const noun = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const sceneTitle = (id: string) => {
  const scene = scenes.find((item) => item.id === id);
  return scene ? `${scene.number} ${prettyTitle(scene.title)}` : id;
};

const latestFor = (sceneId: string | null, playable = false) =>
  clips.find(
    (clip) => (!sceneId || clip.scene === sceneId) && (!playable || clip.bytes > 2048),
  ) ?? clips.find((clip) => !sceneId || clip.scene === sceneId);

const statusText = (message: string) => {
  if (statusEl instanceof HTMLElement) statusEl.textContent = message;
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
    return (await response.json()) as Clip[];
  } catch {
    return [];
  }
}

function sceneRow(scene: SceneMeta): string {
  const last = latestFor(scene.id);
  const on = selected === scene.id ? ' is-on' : '';
  return `<tr class="${on.trim()}" data-scene="${esc(scene.id)}" aria-selected="${selected === scene.id}">
    <td>
      <a class="name" href="./scenes/${esc(scene.id)}/index.html">
        <span class="num">${esc(scene.number)}</span>${esc(prettyTitle(scene.title))}
      </a>
    </td>
    <td class="meta hide-narrow">${scene.width}×${scene.height}</td>
    <td class="meta">${esc(formatDuration(scene.duration))}</td>
    <td class="meta hide-narrow">${last ? esc(formatWhen(last.mtime)) : '—'}</td>
    <td>
      <span class="acts">
        <button type="button" data-export="mp4">MP4</button>
        <button type="button" data-export="mov">MOV</button>
      </span>
    </td>
  </tr>`;
}

function assetRow(row: SlotRow): string {
  return `<tr>
    <td class="name">${esc(row.id)}</td>
    <td class="meta">${esc(row.kind)}</td>
    <td class="meta">${esc(row.state)}</td>
  </tr>`;
}

function clipRow(clip: Clip): string {
  const confirm = pendingDelete === clip.name;
  return `<tr data-clip="${esc(clip.name)}">
    <td>
      <button type="button" class="name" data-play="${esc(clip.name)}" title="${esc(clip.name)}">${esc(clip.name)}</button>
    </td>
    <td class="meta hide-narrow">${esc(sceneTitle(clip.scene))}</td>
    <td class="meta">${esc(formatBytes(clip.bytes))}</td>
    <td class="meta hide-narrow">${esc(formatWhen(clip.mtime))}</td>
    <td>
      <span class="acts">
        <a href="/api/recordings/${encodeURIComponent(clip.name)}?download=1" download="${esc(clip.name)}">Save</a>
        <button type="button" class="${confirm ? 'is-warn' : ''}" data-delete="${esc(clip.name)}">${confirm ? 'Confirm' : 'Delete'}</button>
      </span>
    </td>
  </tr>`;
}

function seekPoster(video: HTMLVideoElement) {
  const duration = video.duration;
  if (!Number.isFinite(duration) || duration <= 0) return;
  video.currentTime = Math.min(duration * 0.42, Math.max(duration - 0.08, 0));
}

if (reviewFilm instanceof HTMLVideoElement) {
  reviewFilm.addEventListener('loadedmetadata', () => seekPoster(reviewFilm));
  reviewFilm.addEventListener('error', () => {
    if (reviewEl instanceof HTMLElement) reviewEl.hidden = true;
  });
}

function renderReview() {
  const clip = latestFor(selected, true) ?? clips[0];
  if (!(reviewEl instanceof HTMLElement) || !(reviewFilm instanceof HTMLVideoElement)) return;
  if (!clip) {
    reviewEl.hidden = true;
    reviewFilm.removeAttribute('src');
    reviewFilm.load();
    return;
  }
  const href = `/api/recordings/${encodeURIComponent(clip.name)}`;
  if (reviewFilm.getAttribute('src') !== href) {
    reviewFilm.src = href;
    reviewFilm.load();
  }
  if (reviewName instanceof HTMLElement) reviewName.textContent = clip.name;
  if (reviewInfo instanceof HTMLElement) {
    reviewInfo.textContent = `${formatBytes(clip.bytes)} · ${formatWhen(clip.mtime)}`;
  }
  reviewEl.hidden = false;
  reviewEl.setAttribute('aria-label', `Play ${clip.name}`);
}

function render() {
  if (scenesEl) {
    scenesEl.innerHTML =
      scenes.map(sceneRow).join('') ||
      '<tr class="empty"><td colspan="5">No scenes yet. Scaffold one with npm run new 001 first-clip.</td></tr>';
  }

  const slots = listSlots();
  if (assetsEl) {
    assetsEl.innerHTML = slots.map(assetRow).join('');
  }

  const visible = selected ? clips.filter((clip) => clip.scene === selected) : clips;
  if (clipsEl) {
    clipsEl.innerHTML =
      visible.map(clipRow).join('') ||
      `<tr class="empty"><td colspan="5">${
        selected
          ? 'No recordings for this scene yet. Export MP4 or MOV from the row above.'
          : 'Nothing in recordings/. Export a scene to write a clip here.'
      }</td></tr>`;
  }

  if (summaryEl instanceof HTMLElement) {
    const ready = slots.filter((row) => row.state === 'ready').length;
    const parts = [
      noun(scenes.length, 'scene', 'scenes'),
      noun(ready, 'asset', 'assets'),
      noun(clips.length, 'recording', 'recordings'),
    ];
    parts.push(live ? 'local' : 'preview only');
    if (selected) parts.push(sceneTitle(selected));
    summaryEl.textContent = parts.join(' · ');
  }

  if (clipFilter instanceof HTMLButtonElement) {
    clipFilter.hidden = !selected;
    clipFilter.textContent = 'Show all';
  }

  renderReview();
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
      onStatus: statusText,
      onProgress: (progress) => {
        applyExportProgress({
          ...progress,
          label: progress.label || `Exporting ${format.toUpperCase()}`,
        });
      },
    });
    applyExportProgress(null);
    statusText(name);
    await refresh();
  } catch (error) {
    applyExportProgress(null);
    statusText(error instanceof Error ? error.message : 'Export failed');
  } finally {
    document.body.classList.remove('busy');
  }
}

function openViewer(name: string) {
  if (!(player instanceof HTMLVideoElement) || !(viewer instanceof HTMLElement)) return;
  player.src = `/api/recordings/${encodeURIComponent(name)}`;
  if (viewerName instanceof HTMLElement) viewerName.textContent = name;
  viewer.hidden = false;
  void player.play();
}

function closeViewer() {
  if (!(player instanceof HTMLVideoElement) || !(viewer instanceof HTMLElement)) return;
  player.pause();
  player.removeAttribute('src');
  player.load();
  viewer.hidden = true;
}

function playLatestReview() {
  const clip = latestFor(selected, true) ?? clips[0];
  if (clip) openViewer(clip.name);
}

scenesEl?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest('button[data-export]');
  if (button) {
    const row = button.closest('[data-scene]');
    const scene = row?.getAttribute('data-scene');
    const format = button.getAttribute('data-export');
    if (!scene || (format !== 'mp4' && format !== 'mov')) return;
    void exportScene(scene, format);
    return;
  }
  if (target?.closest('a')) return;
  const scene = target?.closest('[data-scene]')?.getAttribute('data-scene');
  if (!scene) return;
  selected = selected === scene ? null : scene;
  pendingDelete = null;
  render();
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
      render();
      return;
    }
    pendingDelete = null;
    void fetch(`/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(
      refresh,
    );
    return;
  }
  pendingDelete = null;
  render();
});

clipFilter?.addEventListener('click', () => {
  selected = null;
  pendingDelete = null;
  render();
});

reviewEl?.addEventListener('click', playLatestReview);

document.querySelector('#viewer-close')?.addEventListener('click', closeViewer);

viewer?.addEventListener('click', (event) => {
  if (event.target === viewer) closeViewer();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (viewer instanceof HTMLElement && !viewer.hidden) {
      closeViewer();
      return;
    }
    if (pendingDelete || selected) {
      pendingDelete = null;
      selected = null;
      render();
    }
  }
});

void refresh();
