import { describe, expect, it } from 'vitest';
import {
  clipFilename,
  formatBytes,
  formatClock,
  formatDuration,
  parseSceneSource,
  safeRecordingName,
} from './scene-meta';

describe('parseSceneSource', () => {
  it('reads width, height, and a named duration', () => {
    const meta = parseSceneSource(
      '001-run-lifecycle',
      'const DURATION = 10000;\nmountStage({ width: 1920, height: 1080, duration: DURATION, });',
    );
    expect(meta).toMatchObject({
      id: '001-run-lifecycle',
      number: '001',
      title: 'run lifecycle',
      width: 1920,
      height: 1080,
      duration: 10000,
    });
  });

  it('does not pick a later popIn duration', () => {
    const meta = parseSceneSource(
      '001-run-lifecycle',
      'const DURATION = 10000;\nmountStage({ width: 1920, height: 1080, duration: DURATION, build() { popIn(tl, nodes, { duration: 640 }); } });',
    );
    expect(meta.duration).toBe(10000);
  });
});

describe('clipFilename', () => {
  it('stamps the scene and format', () => {
    expect(clipFilename('001-run-lifecycle', 'mp4', new Date('2026-08-18T08:24:05.000Z'))).toBe(
      '001-run-lifecycle-20260818-082405.mp4',
    );
  });
});

describe('safeRecordingName', () => {
  it('rejects path traversal', () => {
    expect(() => safeRecordingName('../secret.mp4')).toThrow();
    expect(safeRecordingName('001-run-lifecycle-20260818-082405.mov')).toBe(
      '001-run-lifecycle-20260818-082405.mov',
    );
  });
});

describe('formatters', () => {
  it('renders sizes and durations', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatDuration(10000)).toBe('10s');
  });

  it('renders a seekable clock', () => {
    expect(formatClock(0)).toBe('0:00.0');
    expect(formatClock(840)).toBe('0:00.8');
    expect(formatClock(40000)).toBe('0:40.0');
    expect(formatClock(65000)).toBe('1:05.0');
  });
});
