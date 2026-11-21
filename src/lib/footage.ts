import { Timeline } from './timeline';

/**
 * Why: a <video> plays on the wall clock, so a frame-stepped export would
 * capture whatever frame the decoder happened to be on, and preview would
 * drift from the score. footage() keeps the video paused and drives its
 * currentTime from the timeline; every seek it starts is tracked so export
 * can wait for the exact frame (see settled(), called by the export loop).
 * Encode footage all-intra (`-g 1`) so each seek decodes one frame.
 */
const pending = new Set<Promise<void>>();

export function footage(
  tl: Timeline,
  host: HTMLElement,
  {
    at,
    rate = 1,
    from = 0,
  }: {
    /** Scene time the first frame of the clip is shown. */
    at: number;
    /** Playback speed. 1 plays the file as cut. */
    rate?: number;
    /** Seconds into the file to start from. */
    from?: number;
  },
): void {
  const video = host.querySelector('video');
  if (!video) throw new Error('footage(): no <video> under the host; fill the asset first.');
  video.loop = false;
  video.pause();

  // Compare against the last time we asked for, not currentTime: the decoder
  // snaps currentTime to its frame grid, so comparing with it would re-seek
  // the same frame forever once the clip has ended (or not yet started).
  let asked = Number.NaN;
  // Registered at build, so `t` is absolute scene time (as in countUp).
  tl.raf((t) => {
    const end = Number.isFinite(video.duration) ? video.duration - 0.001 : Infinity;
    const target = Math.min(end, Math.max(0, from + (Math.max(0, t - at) * rate) / 1000));
    if (target !== asked) {
      asked = target;
      seek(video, target);
    }
    return true;
  });
}

function seek(video: HTMLVideoElement, time: number): void {
  const done = new Promise<void>((resolve) => {
    let timer = 0;
    const finish = () => {
      video.removeEventListener('seeked', finish);
      window.clearTimeout(timer);
      pending.delete(done);
      resolve();
    };
    video.addEventListener('seeked', finish);
    // A seek that is superseded still fires seeked once; never hang export.
    timer = window.setTimeout(finish, 2000);
  });
  pending.add(done);
  video.currentTime = time;
}

/** Resolves once every video seek started so far has landed on its frame. */
export async function settled(): Promise<void> {
  // A clip that has not decoded its first frame yet. A seeking video reports
  // a low readyState too, but its seek is already in `pending`, and
  // loadeddata never fires twice, so waiting on it here would only time out.
  const loading = [...document.querySelectorAll('video')].filter(
    (v) => v.readyState < 2 && !v.seeking,
  );
  await Promise.all(
    loading.map(
      (v) =>
        new Promise<void>((resolve) => {
          const timer = window.setTimeout(resolve, 5000);
          const ok = () => {
            window.clearTimeout(timer);
            resolve();
          };
          v.addEventListener('loadeddata', ok, { once: true });
          v.addEventListener('seeked', ok, { once: true });
        }),
    ),
  );
  while (pending.size) await Promise.all([...pending]);
}
