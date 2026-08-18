import { requestExport } from './lib/export';
import { type ClipFormat, type SceneMeta } from './lib/scene-meta';

type Clip = {
  name: string;
  bytes: number;
  mtime: string;
  scene: string;
};

const scenesEl = document.querySelector('#scenes');
const clipsEl = document.querySelector('#clips');
const statusEl = document.querySelector('#status');
const viewer = document.querySelector('#viewer');
const player = document.querySelector('#player');

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

const statusText = (message: string) => {
  if (statusEl instanceof HTMLElement) statusEl.textContent = message;
};

async function loadScenes(): Promise<SceneMeta[]> {
  try {
    const response = await fetch('/api/scenes');
    if (!response.ok) throw new Error('no api');
    return (await response.json()) as SceneMeta[];
  } catch {
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
  return `<div class="row" data-scene="${scene.id}">
    <a class="name" href="./scenes/${scene.id}/index.html">${scene.number} ${scene.title}</a>
    <span class="acts">
      <button type="button" data-export="mp4">MP4</button>
      <button type="button" data-export="mov">MOV</button>
    </span>
  </div>`;
}

function clipRow(clip: Clip): string {
  return `<div class="row" data-clip="${clip.name}">
    <button type="button" class="name" data-play="${clip.name}">${clip.name}</button>
    <span class="acts">
      <a href="/api/recordings/${encodeURIComponent(clip.name)}?download=1" download="${clip.name}">Save</a>
      <button type="button" data-delete="${clip.name}">Delete</button>
    </span>
  </div>`;
}

function renderScenes(scenes: SceneMeta[]) {
  if (!scenesEl) return;
  scenesEl.innerHTML = scenes.map(sceneRow).join('');
}

function renderClips(clips: Clip[]) {
  if (!clipsEl) return;
  clipsEl.innerHTML = clips.map(clipRow).join('');
}

async function refresh() {
  const [scenes, clips] = await Promise.all([loadScenes(), loadClips()]);
  renderScenes(scenes);
  renderClips(clips);
}

async function exportScene(scene: string, format: ClipFormat) {
  document.body.classList.add('busy');
  try {
    const name = await requestExport(format, { scene, onStatus: statusText });
    statusText(name);
    await refresh();
  } catch (error) {
    statusText(error instanceof Error ? error.message : 'Export failed');
  } finally {
    document.body.classList.remove('busy');
  }
}

function openViewer(name: string) {
  if (!(player instanceof HTMLVideoElement) || !(viewer instanceof HTMLElement)) return;
  player.src = `/api/recordings/${encodeURIComponent(name)}`;
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

scenesEl?.addEventListener('click', (event) => {
  const button =
    event.target instanceof Element ? event.target.closest('button[data-export]') : null;
  if (!button) return;
  const row = button.closest('[data-scene]');
  const scene = row?.getAttribute('data-scene');
  const format = button.getAttribute('data-export');
  if (!scene || (format !== 'mp4' && format !== 'mov')) return;
  void exportScene(scene, format);
});

clipsEl?.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const play = target?.closest('[data-play]');
  const remove = target?.closest('[data-delete]');
  if (play) {
    const name = play.getAttribute('data-play');
    if (name) openViewer(name);
    return;
  }
  if (remove) {
    const name = remove.getAttribute('data-delete');
    if (!name) return;
    void fetch(`/api/recordings/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(
      refresh,
    );
  }
});

document.querySelector('#viewer-close')?.addEventListener('click', closeViewer);

viewer?.addEventListener('click', (event) => {
  if (event.target === viewer) closeViewer();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeViewer();
});

void refresh();
