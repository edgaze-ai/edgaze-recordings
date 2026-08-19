import { type ClipFormat } from './scene-meta';

export type ExportPhase =
  'idle' | 'queued' | 'arm' | 'capture' | 'encode' | 'save' | 'done' | 'error';

export type ExportProgress = {
  phase: ExportPhase;
  percent: number;
  frame?: number;
  frames?: number;
  label?: string;
  name?: string;
  error?: string;
};

export type ExportHandle = {
  scene: string;
  stage?: HTMLElement;
  duration?: number;
  playOnce?: (onTick?: (ms: number, duration: number) => void) => Promise<void>;
  setRecording?: (on: boolean) => void;
  onStatus?: (message: string) => void;
  onProgress?: (progress: ExportProgress) => void;
};

/**
 * Why: the operator needs a file on disk, not a reminder to screen-record.
 * The Vite server steps the scene at 60fps, captures the 1080p stage at 2×,
 * and encodes 4K H.264 with ffmpeg.
 * Tab capture is only the fallback when that API is not running.
 */
export async function requestExport(format: ClipFormat, handle: ExportHandle): Promise<string> {
  const status = handle.onStatus ?? (() => undefined);
  const progress = handle.onProgress;
  status(`Exporting ${format.toUpperCase()}…`);
  progress?.({
    phase: 'queued',
    percent: 0,
    label: `Exporting ${format.toUpperCase()}`,
  });

  try {
    const filename = await exportOnServer(handle.scene, format, progress);
    progress?.({ phase: 'done', percent: 100, name: filename, label: 'Done' });
    status(`Saved ${filename}`);
    downloadHref(`/api/recordings/${encodeURIComponent(filename)}?download=1`, filename);
    return filename;
  } catch (error) {
    if (!handle.stage || !handle.playOnce || !handle.setRecording || !handle.duration) {
      throw error;
    }
    status('Server export unavailable — capturing this tab');
    progress?.({ phase: 'capture', percent: 0, label: 'Capturing this tab' });
    const blob = await captureTab(
      handle.stage,
      handle.duration,
      handle.playOnce,
      handle.setRecording,
      (tick) => progress?.(tick),
    );
    const filename = `${handle.scene}.${format}`;
    try {
      await archiveRecording(filename, blob);
    } catch {
      // Archive is optional when running without the recordings API.
    }
    downloadBlob(blob, filename);
    progress?.({ phase: 'done', percent: 100, name: filename, label: 'Done' });
    status(`Saved ${filename}`);
    return filename;
  }
}

export function applyExportProgress(progress: ExportProgress | null): void {
  const xfer = document.querySelector('#xfer');
  const label = document.querySelector('#xfer-label');
  const pct = document.querySelector('#xfer-pct');
  if (!(xfer instanceof HTMLElement)) return;

  if (!progress || progress.phase === 'idle' || progress.phase === 'done') {
    xfer.hidden = true;
    xfer.style.setProperty('--xfer', '0');
    return;
  }

  const percent = Math.max(0, Math.min(100, Math.round(progress.percent)));
  xfer.hidden = false;
  xfer.style.setProperty('--xfer', String(percent / 100));
  if (label instanceof HTMLElement) {
    label.textContent = progressLabel(progress);
  }
  if (pct instanceof HTMLElement) {
    pct.textContent = `${percent}%`;
  }
}

export function progressLabel(progress: ExportProgress): string {
  if (progress.label) {
    if (progress.phase === 'capture' && progress.frames) {
      return `${progress.label} · ${progress.frame ?? 0}/${progress.frames}`;
    }
    return progress.label;
  }
  if (progress.phase === 'error') return progress.error || 'Export failed';
  return 'Exporting';
}

async function exportOnServer(
  scene: string,
  format: ClipFormat,
  onProgress?: (progress: ExportProgress) => void,
): Promise<string> {
  const poll = window.setInterval(() => {
    void fetch('/api/export/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data === 'object') onProgress?.(data as ExportProgress);
      })
      .catch(() => undefined);
  }, 160);

  try {
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene, format }),
    });
    if (!response.ok) {
      const text = await response.text();
      let message = text || `Export failed (${response.status})`;
      try {
        const body = JSON.parse(text) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Keep the raw body when the server did not return JSON.
      }
      throw new Error(message);
    }
    const body = (await response.json()) as { name?: string; error?: string };
    if (!body.name) throw new Error(body.error || 'Export failed');
    return body.name;
  } finally {
    window.clearInterval(poll);
  }
}

async function archiveRecording(filename: string, blob: Blob): Promise<void> {
  const response = await fetch(`/api/recordings/${encodeURIComponent(filename)}`, {
    method: 'PUT',
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    body: blob,
  });
  if (!response.ok) throw new Error('Could not archive recording');
}

function downloadHref(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadHref(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

async function captureTab(
  stage: HTMLElement,
  _duration: number,
  playOnce: (onTick?: (ms: number, duration: number) => void) => Promise<void>,
  setRecording: (on: boolean) => void,
  onProgress?: (progress: ExportProgress) => void,
): Promise<Blob> {
  const mime = pickRecorderMime();
  const controller = 'CaptureController' in window ? new CaptureController() : undefined;
  controller?.setFocusBehavior?.('no-focus-change');

  setRecording(true);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: 60,
      width: 1920,
      height: 1080,
      displaySurface: 'browser',
    },
    audio: false,
    preferCurrentTab: true,
    selfBrowserSurface: 'include',
    controller,
  } as DisplayMediaStreamOptions);

  const [track] = stream.getVideoTracks();
  if (track && 'CropTarget' in window) {
    const target = await CropTarget.fromElement(stage);
    await track.cropTo?.(target);
  }

  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType || mime || 'video/webm' }));
    recorder.onerror = () => reject(new Error('Recorder failed'));
  });

  recorder.start(200);
  try {
    await playOnce((ms, total) => {
      onProgress?.({
        phase: 'capture',
        percent: total > 0 ? Math.min(99, (ms / total) * 100) : 0,
        label: 'Capturing this tab',
      });
    });
    await new Promise((resolve) => window.setTimeout(resolve, 240));
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    for (const item of stream.getTracks()) item.stop();
    setRecording(false);
  }
  return stopped;
}

function pickRecorderMime(): string {
  const types = [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}
