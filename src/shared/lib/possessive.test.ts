import { describe, expect, it } from 'vitest';
import { possessive } from './possessive';

describe('possessive', () => {
  it("adds 's", () => {
    expect(possessive('Hanna')).toBe("Hanna's");
    expect(possessive('Jörg')).toBe("Jörg's");
  });

  it.each(['Hans', 'Max', 'Franz', 'Voß', 'HANS'])('adds only the apostrophe to "%s"', (name) => {
    expect(possessive(name)).toBe(`${name}'`);
  });
});
