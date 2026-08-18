import { describe, expect, it } from 'vitest';
import { catalogFromGlob, fillAssets, kindOf, listSlots, parseAssetPath } from './assets';

describe('parseAssetPath', () => {
  it('reads the slot id from a glob key', () => {
    expect(parseAssetPath('../assets/photos/01.svg')).toEqual({
      id: 'photos/01',
      ext: 'svg',
      kind: 'photo',
    });
    expect(parseAssetPath('../assets/videos/loop.mp4')).toEqual({
      id: 'videos/loop',
      ext: 'mp4',
      kind: 'video',
    });
    expect(parseAssetPath('../assets/gifs/pulse.gif')).toEqual({
      id: 'gifs/pulse',
      ext: 'gif',
      kind: 'gif',
    });
  });

  it('ignores files outside assets', () => {
    expect(parseAssetPath('../styles/tokens.css')).toBeNull();
  });
});

describe('catalogFromGlob', () => {
  it('lets a photo win over the svg placeholder', () => {
    const catalog = catalogFromGlob({
      '../assets/photos/01.svg': '/assets/01.svg',
      '../assets/photos/01.jpg': '/assets/01.jpg',
    });
    expect(catalog.get('photos/01')?.url).toBe('/assets/01.jpg');
    expect(catalog.get('photos/01')?.kind).toBe('photo');
  });
});

describe('listSlots', () => {
  it('keeps empty video slots and marks svg as a plate', () => {
    const catalog = catalogFromGlob({
      '../assets/photos/01.svg': '/assets/01.svg',
      '../assets/photos/hero.jpg': '/assets/hero.jpg',
    });
    const rows = listSlots(catalog);
    expect(rows.find((row) => row.id === 'photos/01')?.state).toBe('plate');
    expect(rows.find((row) => row.id === 'videos/01')?.state).toBe('empty');
    expect(rows.find((row) => row.id === 'photos/hero')).toMatchObject({
      state: 'ready',
      kind: 'photo',
    });
  });
});

describe('kindOf', () => {
  it('follows the folder, then the extension', () => {
    expect(kindOf('videos', 'mp4')).toBe('video');
    expect(kindOf('photos', 'gif')).toBe('gif');
    expect(kindOf('photos', 'png')).toBe('photo');
  });
});

describe('fillAssets', () => {
  it('injects an image into a plate', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="plate" data-asset="photos/01"><i></i></div>';
    const catalog = catalogFromGlob({ '../assets/photos/01.jpg': '/assets/01.jpg' });
    fillAssets(root, catalog);
    const img = root.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/assets/01.jpg');
    expect(root.querySelector('.plate')?.getAttribute('data-kind')).toBe('photo');
  });

  it('throws when the slot is empty', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="plate" data-asset="photos/missing"><i></i></div>';
    expect(() => fillAssets(root, new Map())).toThrow(/photos\/missing/);
  });
});
