export type ClipFormat = 'mp4' | 'mov';

export type SceneMeta = {
  id: string;
  number: string;
  title: string;
  width: number;
  height: number;
  duration: number;
};

/**
 * Why: the dashboard and the export server both need width, height, and
 * duration without adding a third file to a scene folder.
 */
export function parseSceneSource(id: string, source: string): SceneMeta {
  const named = source.match(/const DURATION\s*=\s*(\d+)/);
  const mount = source.match(/mountStage\(\s*\{[\s\S]*?\bduration:\s*(\d+|DURATION)/);
  const duration = Number(named?.[1] ?? (mount?.[1] && mount[1] !== 'DURATION' ? mount[1] : 0));
  const width = Number(source.match(/width:\s*(\d+)/)?.[1] ?? 1920);
  const height = Number(source.match(/height:\s*(\d+)/)?.[1] ?? 1080);
  const [number, ...rest] = id.split('-');
  return {
    id,
    number: number ?? id,
    title: rest.join(' ').replace(/-/g, ' '),
    width,
    height,
    duration,
  };
}

export function clipFilename(scene: string, format: ClipFormat, at = new Date()): string {
  const stamp = at
    .toISOString()
    .slice(0, 19)
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace('T', '-');
  return `${scene}-${stamp}.${format}`;
}

export function safeRecordingName(name: string): string {
  if (!/^[A-Za-z0-9._-]+\.(mp4|mov|webm)$/.test(name)) {
    throw new Error('Invalid recording name');
  }
  return name;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  if (!ms) return '—';
  const seconds = ms / 1000;
  return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`;
}
