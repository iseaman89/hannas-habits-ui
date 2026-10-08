import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('joins the given class names with a space', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('skips false, null, undefined and empty strings', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('returns an empty string when nothing is left', () => {
    expect(cn(false, undefined)).toBe('');
  });
});
