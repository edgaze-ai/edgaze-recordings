export type AssetKind = 'photo' | 'video' | 'gif';

export type Asset = {
  id: string;
  url: string;
  kind: AssetKind;
  ext: string;
};

const RANK = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'mp4', 'webm', 'mov', 'svg'];

const VIDEO_EXT = new Set(['mp4', 'webm', 'mov']);
const GIF_EXT = new Set(['gif']);

/**
 * Why: a photo dropped next to an SVG slot must win. The SVG is the empty
 * plate; the raster or footage is the shot.
 */
export function catalogFromGlob(modules: Record<string, string>): Map<string, Asset> {
  const catalog = new Map<string, Asset>();
  for (const [path, url] of Object.entries(modules)) {
    const parsed = parseAssetPath(path);
    if (!parsed) continue;
    const next: Asset = { ...parsed, url };
    const prev = catalog.get(next.id);
    if (!prev || rank(next.ext) < rank(prev.ext)) catalog.set(next.id, next);
  }
  return catalog;
}

export function parseAssetPath(path: string): Omit<Asset, 'url'> | null {
  const match = path.match(/assets\/(.+)\.([a-z0-9]+)$/i);
  if (!match) return null;
  const rel = match[1] ?? '';
  const ext = (match[2] ?? '').toLowerCase();
  if (!rel || !RANK.includes(ext)) return null;
  const folder = rel.split('/')[0];
  return { id: rel, ext, kind: kindOf(folder, ext) };
}

export function kindOf(folder: string, ext: string): AssetKind {
  if (folder === 'videos' || VIDEO_EXT.has(ext)) return 'video';
  if (folder === 'gifs' || GIF_EXT.has(ext)) return 'gif';
  return 'photo';
}

function rank(ext: string): number {
  const index = RANK.indexOf(ext);
  return index === -1 ? RANK.length : index;
}

const modules = import.meta.glob<string>(
  '../assets/**/*.{png,jpg,jpeg,webp,avif,gif,svg,mp4,webm,mov}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
);

export const catalog = catalogFromGlob(modules);

export const SLOTS = [
  'photos/01',
  'photos/02',
  'photos/03',
  'photos/04',
  'videos/01',
  'videos/02',
  'gifs/01',
] as const;

export type SlotState = 'empty' | 'plate' | 'ready';

export type SlotRow = {
  id: string;
  kind: AssetKind;
  state: SlotState;
  asset?: Asset;
};

export function listAssets(): Asset[] {
  return [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function listSlots(source: Map<string, Asset> = catalog): SlotRow[] {
  const declared = new Set<string>(SLOTS);
  const fromSlots = SLOTS.map((id) => rowFor(id, source.get(id)));
  const extras = [...source.values()]
    .filter((item) => !declared.has(item.id))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((item) => rowFor(item.id, item));
  return [...fromSlots, ...extras];
}

function rowFor(id: string, item?: Asset): SlotRow {
  const folder = id.split('/')[0] ?? 'photos';
  const kind = item ? item.kind : kindOf(folder, '');
  if (!item) return { id, kind, state: 'empty' };
  return { id, kind, state: item.ext === 'svg' ? 'plate' : 'ready', asset: item };
}

export function asset(id: string): Asset {
  const found = catalog.get(id);
  if (!found) {
    throw new Error(`Missing asset "${id}". Drop a file in src/assets/${id}.*`);
  }
  return found;
}

/**
 * Why: scenes stay markup. A plate names a slot; this fills the media so the
 * storyboard never imports a file path.
 */
export function fillAssets(root: ParentNode, source: Map<string, Asset> = catalog): void {
  root.querySelectorAll<HTMLElement>('[data-asset]').forEach((el) => {
    if (el.dataset.filled === '1') return;
    const id = el.getAttribute('data-asset') ?? '';
    const item = source.get(id);
    if (!item) {
      throw new Error(`Missing asset "${id}". Drop a file in src/assets/${id}.*`);
    }
    let inner = el.querySelector<HTMLElement>(':scope > i');
    if (!inner) {
      inner = document.createElement('i');
      el.append(inner);
    }
    inner.replaceChildren(mediaEl(item));
    el.dataset.filled = '1';
    el.dataset.kind = item.kind;
  });
}

function mediaEl(item: Asset): HTMLImageElement | HTMLVideoElement {
  if (item.kind === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.setAttribute('playsinline', '');
    return video;
  }
  const img = document.createElement('img');
  img.src = item.url;
  img.alt = '';
  img.draggable = false;
  return img;
}
