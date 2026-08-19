import { describe, expect, it } from 'vitest';
import { progressLabel } from './export';

describe('progressLabel', () => {
  it('keeps a custom label', () => {
    expect(progressLabel({ phase: 'arm', percent: 1, label: 'Opening scene' })).toBe(
      'Opening scene',
    );
  });

  it('adds frame counts while capturing', () => {
    expect(
      progressLabel({
        phase: 'capture',
        percent: 40,
        frame: 240,
        frames: 600,
        label: 'Capturing',
      }),
    ).toBe('Capturing · 240/600');
  });
});
