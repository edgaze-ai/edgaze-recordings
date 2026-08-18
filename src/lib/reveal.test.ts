import { describe, expect, it } from 'vitest';
import { prepare, units } from './reveal';

describe('prepare', () => {
  it('wraps each word in a clip mask', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p data-split>Run lifecycle</p>';
    prepare(root);
    expect(root.querySelectorAll('.m').length).toBe(2);
    expect(units(root)).toHaveLength(2);
  });

  it('keeps a gradient phrase as one masked unit', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p class="grad" data-split="whole">one arc.</p>';
    prepare(root);
    expect(root.querySelectorAll('.m')).toHaveLength(1);
    expect(root.querySelector('i')?.classList.contains('grad')).toBe(true);
    expect(root.querySelector('.grad') === root.querySelector('i')).toBe(true);
  });
});
