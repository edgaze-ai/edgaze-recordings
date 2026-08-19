import { describe, expect, it } from 'vitest';
import { Timeline, ease } from './timeline';

describe('ease', () => {
  it('reads curves from tokens instead of literals', () => {
    const root = document.documentElement.style;
    root.setProperty('--expo', 'cubic-bezier(0.16, 1, 0.3, 1)');
    root.setProperty('--quint', 'cubic-bezier(0.22, 1, 0.36, 1)');
    root.setProperty('--travel', 'cubic-bezier(0.5, 0, 0.5, 1)');
    expect(ease.expo).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    expect(ease.quint).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(ease.travel).toBe('cubic-bezier(0.5, 0, 0.5, 1)');
    expect(ease.linear).toBe('linear');
  });
});

describe('Timeline seek', () => {
  it('exposes storyboard time after seek', () => {
    const tl = new Timeline(1, true);
    expect(tl.time).toBe(0);
    tl.seek(840);
    expect(tl.time).toBe(840);
  });

  it('fires at() cues once while seeking forward', () => {
    const tl = new Timeline(1, true);
    const hits: number[] = [];
    tl.at(100, () => hits.push(1));
    tl.at(200, () => hits.push(2));
    tl.seek(50);
    expect(hits).toEqual([]);
    tl.seek(100);
    expect(hits).toEqual([1]);
    tl.seek(250);
    expect(hits).toEqual([1, 2]);
    tl.seek(400);
    expect(hits).toEqual([1, 2]);
  });

  it('drives raf hooks from seek time', () => {
    const tl = new Timeline(1, true);
    const samples: number[] = [];
    tl.at(10, () => {
      tl.raf((t) => {
        samples.push(t);
        return t < 20;
      });
    });
    tl.seek(10);
    tl.seek(25);
    tl.seek(40);
    expect(samples).toEqual([0, 15, 30]);
    tl.seek(80);
    expect(samples).toEqual([0, 15, 30]);
  });
});
