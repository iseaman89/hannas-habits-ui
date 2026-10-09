import { describe, expect, it } from 'vitest';
import { parseApiDate, toApiDate } from '@/shared/lib/dates';

describe('toApiDate', () => {
  it('formats the local calendar day as yyyy-MM-dd', () => {
    expect(toApiDate(new Date(2026, 9, 8))).toBe('2026-10-08');
  });

  it('pads month and day', () => {
    expect(toApiDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('keeps the local day just after midnight (toISOString would be the previous UTC day east of Greenwich)', () => {
    expect(toApiDate(new Date(2026, 9, 8, 0, 30))).toBe('2026-10-08');
  });

  it('keeps the local day just before midnight (toISOString would be the next UTC day west of Greenwich)', () => {
    expect(toApiDate(new Date(2026, 9, 8, 23, 30))).toBe('2026-10-08');
  });
});

describe('parseApiDate', () => {
  it('returns local midnight of the day', () => {
    const date = parseApiDate('2026-10-08');

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(9);
    expect(date?.getDate()).toBe(8);
    expect(date?.getHours()).toBe(0);
  });

  it('round-trips with toApiDate, including a leap day', () => {
    expect(toApiDate(parseApiDate('2028-02-29')!)).toBe('2028-02-29');
  });

  it.each([
    ['empty string', ''],
    ['not a date', 'today'],
    ['wrong order', '08.10.2026'],
    ['non-existent day', '2026-02-30'],
    ['non-existent leap day', '2027-02-29'],
    ['month 13', '2026-13-01'],
    ['non-padded month and day', '2026-2-3'],
    ['trailing text', '2026-10-08T00:00:00Z'],
  ])('rejects %s', (_name, value) => {
    expect(parseApiDate(value)).toBeNull();
  });
});
