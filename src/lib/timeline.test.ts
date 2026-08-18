import { describe, expect, it } from 'vitest';
import { ease } from './timeline';

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
