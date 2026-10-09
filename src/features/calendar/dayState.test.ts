import { describe, expect, it } from 'vitest';
import { dayState, opensDiary, type Mood } from './dayState';

const TODAY = '2026-10-07';
const entries = new Map<string, Mood | null>([
  ['2026-10-01', 5],
  ['2026-10-02', 1],
  ['2026-10-03', null], // an entry, but no mood
  ['2026-10-07', 3], // today
  ['2026-10-09', 4], // a day to come that has an entry
]);

describe('the state of a day', () => {
  it.each([
    ['2026-10-01', { kind: 'mood', mood: 5 }],
    ['2026-10-02', { kind: 'mood', mood: 1 }],
    ['2026-10-03', { kind: 'no-mood' }],
    ['2026-10-04', { kind: 'empty' }], // gone by, nothing written
    ['2026-10-07', { kind: 'mood', mood: 3 }], // today with an entry
    ['2025-01-01', { kind: 'empty' }], // another year
    ['2026-10-09', { kind: 'mood', mood: 4 }], // to come, but there is an entry
    ['2026-10-08', { kind: 'future' }], // tomorrow
    ['2026-12-31', { kind: 'future' }],
  ])('%s is %j', (date, expected) => {
    expect(dayState(date, TODAY, entries)).toEqual(expected);
  });

  it('counts today without an entry as a day one can still write, not as a day to come', () => {
    expect(dayState('2026-10-07', '2026-10-07', new Map())).toEqual({ kind: 'empty' });
  });

  it('compares the days, not the length of the text: 2026-09-30 is before 2026-10-01', () => {
    expect(dayState('2026-09-30', '2026-10-01', new Map())).toEqual({ kind: 'empty' });
    expect(dayState('2026-10-01', '2026-09-30', new Map())).toEqual({ kind: 'future' });
  });
});

describe('which days lead to the diary', () => {
  it.each([
    [{ kind: 'mood', mood: 2 } as const, true],
    [{ kind: 'no-mood' } as const, true],
    [{ kind: 'empty' } as const, true],
    [{ kind: 'future' } as const, false],
  ])('%j → %s', (state, expected) => {
    expect(opensDiary(state)).toBe(expected);
  });
});
