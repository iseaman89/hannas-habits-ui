import { describe, expect, it } from 'vitest';
import {
  MAX_PER_YEAR,
  TITLE_MAX_LENGTH,
  newResolutionSchema,
  resolutionSchema,
  toResolutionInput,
  toResolutionValues,
} from './resolutionSchema';

describe('the limits', () => {
  it('mirror the backend’s', () => {
    expect(TITLE_MAX_LENGTH).toBe(200); // Resolution.TitleMaxLength
    expect(MAX_PER_YEAR).toBe(50); // Resolution.MaxPerYear
  });
});

describe('a title', () => {
  it('is trimmed', () => {
    expect(newResolutionSchema.parse({ title: '  Read more  ' })).toEqual({ title: 'Read more' });
  });

  it.each([[''], ['   ']])('may not be blank (%j)', (title) => {
    const result = newResolutionSchema.safeParse({ title });

    expect(result.error?.issues[0]?.message).toBe('Give the resolution a name.');
  });

  it('may be exactly the longest allowed, not one more', () => {
    expect(newResolutionSchema.safeParse({ title: 'x'.repeat(TITLE_MAX_LENGTH) }).success).toBe(
      true,
    );
    const tooLong = newResolutionSchema.safeParse({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) });
    expect(tooLong.error?.issues[0]?.message).toBe('Use at most 200 characters.');
  });

  it('is measured after trimming', () => {
    const padded = ` ${'x'.repeat(TITLE_MAX_LENGTH)} `;

    expect(newResolutionSchema.safeParse({ title: padded }).success).toBe(true);
  });
});

describe('the edit form’s values', () => {
  it('shows “no habit” as an empty select value and sends it as null', () => {
    const values = toResolutionValues({
      id: 'r-1',
      title: 'Read more',
      kept: true,
      habitId: null,
      habitTitle: null,
    });

    expect(values).toEqual({ title: 'Read more', habitId: '' });
    expect(toResolutionInput(values)).toEqual({ title: 'Read more', habitId: null });
  });

  it('carries a habit link both ways', () => {
    const values = toResolutionValues({
      id: 'r-1',
      title: 'Read more',
      kept: false,
      habitId: 'h-1',
      habitTitle: 'Read',
    });

    expect(values.habitId).toBe('h-1');
    expect(toResolutionInput(values)).toEqual({ title: 'Read more', habitId: 'h-1' });
  });

  it('validates the title and leaves the habit to the server', () => {
    expect(resolutionSchema.safeParse({ title: '', habitId: '' }).success).toBe(false);
    expect(resolutionSchema.safeParse({ title: 'a', habitId: 'whatever' }).success).toBe(true);
  });
});
