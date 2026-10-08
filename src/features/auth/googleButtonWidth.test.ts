import { describe, expect, it } from 'vitest';
import { googleButtonWidth } from './googleButtonWidth';

describe('googleButtonWidth', () => {
  it.each([
    [null, 320], // not measured (yet): the old fixed width
    [384, 384], // fills the card
    [264, 264], // follows a narrow card
    [150, 200], // Google draws nothing narrower than 200
    [900, 400], // ... or wider than 400
  ])('for %s px of room it asks Google for %s px', (available, expected) => {
    expect(googleButtonWidth(available)).toBe(expected);
  });
});
