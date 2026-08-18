import { describe, expect, it } from 'vitest';
import { ease } from './timeline';

describe('ease', () => {
  it('reads curves from tokens instead of literals', () => {
    expect(ease.expo).toBe('var(--expo)');
    expect(ease.quint).toBe('var(--quint)');
    expect(ease.travel).toBe('var(--travel)');
    expect(ease.linear).toBe('linear');
  });
});
