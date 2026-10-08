import { describe, expect, it } from 'vitest';
import { describeYear, yearProgress } from './yearProgress';

const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour);

describe('how far a year has come', () => {
  it('counts today as behind: day 280 of 365 is 77 % with 85 days left (the mockup’s numbers)', () => {
    const progress = yearProgress(2026, at(2026, 10, 7));

    expect(progress.phase).toBe('current');
    expect(Math.round(progress.percent)).toBe(77);
    expect(progress.daysLeft).toBe(85);
  });

  it('is one day in on 1 January and none left on 31 December', () => {
    const first = yearProgress(2026, at(2026, 1, 1));
    expect(first.percent).toBeCloseTo(100 / 365);
    expect(first.daysLeft).toBe(364);

    const last = yearProgress(2026, at(2026, 12, 31));
    expect(last.percent).toBe(100);
    expect(last.daysLeft).toBe(0);
  });

  it('knows a leap year has 366 days', () => {
    const progress = yearProgress(2028, at(2028, 12, 30));

    expect(progress.daysLeft).toBe(1);
    expect(progress.percent).toBeCloseTo((365 / 366) * 100);
    expect(yearProgress(2028, at(2028, 3, 1)).daysLeft).toBe(366 - 61); // 31 + 29 + 1
    expect(yearProgress(2027, at(2027, 3, 1)).daysLeft).toBe(365 - 60); // one day fewer in February
  });

  it('is over for a year before this one and not begun for one after it', () => {
    expect(yearProgress(2025, at(2026, 10, 7))).toEqual({
      phase: 'past',
      percent: 100,
      daysLeft: null,
    });
    expect(yearProgress(2027, at(2026, 10, 7))).toEqual({
      phase: 'future',
      percent: 0,
      daysLeft: null,
    });
  });

  it.each([
    ['just after midnight', at(2026, 10, 7, 0)],
    ['just before midnight', new Date(2026, 9, 7, 23, 59)],
  ])('reads the local calendar day, %s', (_name, now) => {
    // The same in every time zone the suite runs in: the day is the person's, not UTC's.
    expect(yearProgress(2026, now).daysLeft).toBe(85);
  });

  it('switches year at local midnight', () => {
    expect(yearProgress(2026, new Date(2026, 11, 31, 23, 59)).phase).toBe('current');
    expect(yearProgress(2026, new Date(2027, 0, 1, 0, 0)).phase).toBe('past');
  });
});

describe('the two lines of the progress card', () => {
  const current = yearProgress(2026, at(2026, 10, 7));

  it('says how much is kept and how long is left', () => {
    expect(describeYear(2026, current, 3, 5)).toEqual({
      caption: 'of 2026 is behind you',
      summary: '3 of 5 resolutions kept so far — 85 days left.',
    });
  });

  it('speaks of one resolution and one day in the singular', () => {
    const lastButOne = yearProgress(2026, at(2026, 12, 30));

    expect(describeYear(2026, lastButOne, 0, 1).summary).toBe(
      '0 of 1 resolution kept so far — 1 day left.',
    );
  });

  it('says so on the last day', () => {
    const last = yearProgress(2026, at(2026, 12, 31));

    expect(describeYear(2026, last, 2, 4).summary).toBe(
      '2 of 4 resolutions kept so far — this is the last day.',
    );
  });

  it('keeps counting days when there is nothing to keep yet', () => {
    expect(describeYear(2026, current, 0, 0).summary).toBe('No resolutions yet — 85 days left.');
  });

  it('drops “so far” and the days left once the year is over', () => {
    const past = yearProgress(2025, at(2026, 10, 7));

    expect(describeYear(2025, past, 4, 5)).toEqual({
      caption: 'of 2025 is behind you',
      summary: '4 of 5 resolutions kept.',
    });
    expect(describeYear(2025, past, 0, 0).summary).toBe('No resolutions yet.');
  });

  it('says that a year to come has not begun', () => {
    const future = yearProgress(2027, at(2026, 10, 7));

    expect(describeYear(2027, future, 0, 3)).toEqual({
      caption: '2027 has not begun yet',
      summary: '0 of 3 resolutions kept.',
    });
  });
});
