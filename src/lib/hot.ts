/**
 * Why: an agent editing a scene saves many files in a burst, and Vite
 * reloads the page on every save. That restarts the film, re-renders the
 * score and makes the editor stutter or lose the playhead mid-scrub.
 *
 * This takes over Vite's full reloads for the page it runs in:
 * - a burst of saves becomes one reload, once the files go quiet;
 * - a reload waits while the operator is scrubbing or exporting;
 * - the export page never reloads, so a capture in flight is never cut;
 * - state is persisted first, so the reload resumes where it was.
 *
 * CSS still hot-swaps through Vite untouched. If this module never loads
 * (a scene that fails to compile), Vite's own reload still runs.
 */
const QUIET_MS = 280;
const HOLD_POLL_MS = 200;

export type ReloadGuard = {
  /** True while a reload would interrupt the operator. */
  hold?: () => boolean;
  /** Save anything that should survive the reload. */
  persist?: () => void;
  /** Called when an edit is seen, before the reload lands. */
  onPending?: () => void;
  /** Export capture pages: swallow reloads entirely. */
  frozen?: boolean;
};

export function guardReloads(guard: ReloadGuard = {}): void {
  const hot = import.meta.hot;
  if (!hot) return;
  let timer = 0;

  const fire = () => {
    timer = 0;
    if (guard.hold?.()) {
      timer = window.setTimeout(fire, HOLD_POLL_MS);
      return;
    }
    guard.persist?.();
    location.reload();
  };

  hot.on('vite:beforeFullReload', (payload: { path?: string }) => {
    const reloadsHere = targetsThisPage(payload.path);
    // Point Vite's own reload at a page that does not exist so it skips it.
    payload.path = '/__edgaze-held__.html';
    if (guard.frozen || !reloadsHere) return;
    guard.onPending?.();
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(fire, QUIET_MS);
  });
}

/** Vite's own rule for whether a full-reload payload applies to this page. */
export function targetsThisPage(path: string | undefined, here = location.pathname): boolean {
  if (!path || !path.endsWith('.html')) return true;
  const page = decodeURI(here);
  return (
    page === path ||
    path === '/index.html' ||
    (page.endsWith('/') && `${page}index.html` === path)
  );
}
