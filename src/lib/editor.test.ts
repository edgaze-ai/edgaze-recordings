import { beforeEach, describe, expect, it } from 'vitest';
import { gridMap } from './beatgrid';
import {
  loadSession,
  preciseClock,
  prefs,
  rulerStep,
  saveSession,
  whereInBars,
} from './editor';
import { targetsThisPage } from './hot';

describe('preciseClock', () => {
  it('shows hundredths so a cut can be judged', () => {
    expect(preciseClock(0)).toBe('0:00.00');
    expect(preciseClock(12_345)).toBe('0:12.35');
    expect(preciseClock(61_500)).toBe('1:01.50');
    expect(preciseClock(-20)).toBe('0:00.00');
  });
});

describe('rulerStep', () => {
  it('keeps labels at least 64px apart', () => {
    expect(rulerStep(34_000, 1400)).toBe(2000);
    expect(rulerStep(34_000, 600)).toBe(5000);
    expect(rulerStep(10_000, 2400)).toBe(500);
  });

  it('falls back for an empty rail', () => {
    expect(rulerStep(0, 800)).toBe(1000);
    expect(rulerStep(34_000, 0)).toBe(1000);
  });
});

describe('whereInBars', () => {
  const map = gridMap(120, 34_000);

  it('reads bar and beat under the playhead', () => {
    expect(whereInBars(map, 0)).toBe('Bar 1.1');
    expect(whereInBars(map, 2_000)).toBe('Bar 2.1');
    expect(whereInBars(map, 2_600)).toBe('Bar 2.2');
    expect(whereInBars(map, 3_999)).toBe('Bar 2.4');
  });
});

describe('targetsThisPage', () => {
  it('reloads every page for a script change', () => {
    expect(targetsThisPage(undefined, '/scenes/014/index.html')).toBe(true);
    expect(targetsThisPage('*', '/scenes/014/index.html')).toBe(true);
  });

  it('reloads only the page whose html changed', () => {
    expect(targetsThisPage('/scenes/014/index.html', '/scenes/014/index.html')).toBe(true);
    expect(targetsThisPage('/scenes/015/index.html', '/scenes/014/index.html')).toBe(false);
    expect(targetsThisPage('/scenes/014/index.html', '/scenes/014/')).toBe(true);
  });
});

describe('editor prefs', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('remembers preview mute across reloads', () => {
    expect(prefs.muted).toBe(false);
    prefs.muted = true;
    expect(localStorage.getItem('edgaze.editor.muted')).toBe('1');
    expect(prefs.muted).toBe(true);
  });

  it('restores the playhead for the same scene only', () => {
    saveSession('014-screening-spotlight', { time: 12_000, playing: true, slow: false });
    expect(loadSession('014-screening-spotlight')).toMatchObject({
      time: 12_000,
      playing: true,
    });
    expect(loadSession('015-screening-spotlight-wide')).toBeNull();
  });
});
