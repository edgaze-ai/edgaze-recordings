/**
 * Harness icons. One 24px grid, 1.75 stroke, currentColor, so a button's
 * colour state drives the glyph. Never used inside a scene.
 */
const svg = (body: string, fill = false) =>
  `<svg class="ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false" ${
    fill
      ? 'fill="currentColor" stroke="none"'
      : 'fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"'
  }>${body}</svg>`;

export const icons = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  play: svg(
    '<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10.2-6.4a.8.8 0 0 0 0-1.4L9.2 4.9A.8.8 0 0 0 8 5.6z"/>',
    true,
  ),
  pause: svg(
    '<rect x="6.5" y="5" width="4" height="14" rx="1"/><rect x="13.5" y="5" width="4" height="14" rx="1"/>',
    true,
  ),
  toStart: svg('<path d="M6 5v14"/><path d="M18 6l-8 6 8 6V6z"/>'),
  toEnd: svg('<path d="M18 5v14"/><path d="M6 6l8 6-8 6V6z"/>'),
  frameBack: svg('<path d="M14 7l-5 5 5 5"/>'),
  frameNext: svg('<path d="M10 7l5 5-5 5"/>'),
  replay: svg('<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>'),
  sound: svg(
    '<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>',
  ),
  muted: svg('<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M22 9l-6 6"/><path d="M16 9l6 6"/>'),
  record: svg(
    '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  ),
  download: svg('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>'),
  slow: svg(
    '<path d="M12 21a9 9 0 1 1 9-9"/><path d="M12 12l4-3"/><path d="M12 7v1"/><path d="M7 12h1"/>',
  ),
  film: svg(
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  ),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  open: svg(
    '<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  ),
  trash: svg(
    '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12"/><path d="M9 7V4h6v3"/>',
  ),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  keyboard: svg(
    '<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  ),
} as const;

export type IconName = keyof typeof icons;
