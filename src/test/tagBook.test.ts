import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/shared/api';
import { createTagBook } from './tagBook';

/**
 * The fake keeps the rules of the real server (B14) - these are the same facts the screens'
 * tests lean on, and the ones that were checked against the running API in F12.
 */
describe('tag book', () => {
  it('creates get-or-create, trimmed and ignoring case', () => {
    const book = createTagBook();

    const first = book.create('  krank ');
    const second = book.create('KRANK');

    expect(first.name).toBe('krank');
    expect(second).toEqual(first);
    expect(book.tags).toHaveLength(1);
  });

  it('refuses a blank name and one over 30 characters, under the key `name`', () => {
    const book = createTagBook();
    const refusal = (name: string) => {
      try {
        book.create(name);
      } catch (error) {
        return error as ApiError;
      }
      throw new Error(`"${name}" was accepted`);
    };

    expect(refusal('   ')).toMatchObject({ status: 400 });
    expect(refusal('   ').fieldErrors['name']).toHaveLength(1);
    expect(refusal('x'.repeat(31)).fieldErrors['name']).toHaveLength(1);
    expect(book.create('x'.repeat(30)).name).toHaveLength(30);
  });

  it('puts a tag on a day once, answers with the day by name and takes it off idempotently', () => {
    const book = createTagBook([
      { id: 'b', name: 'beta' },
      { id: 'a', name: 'alpha' },
    ]);

    book.attach('h', '2026-10-05', 'b');
    book.attach('h', '2026-10-05', 'b');
    const day = book.attach('h', '2026-10-05', 'a');

    expect(day.map((tag) => tag.name)).toEqual(['alpha', 'beta']);
    expect(book.detach('h', '2026-10-05', 'a')).toEqual([{ id: 'b', name: 'beta' }]);
    expect(book.detach('h', '2026-10-05', 'a')).toEqual([{ id: 'b', name: 'beta' }]);
  });

  it('holds at most 10 tags on a day', () => {
    const book = createTagBook(
      Array.from({ length: 11 }, (_, n) => ({ id: `t${n}`, name: `${n}` })),
    );
    for (let n = 0; n < 10; n++) book.attach('h', '2026-10-05', `t${n}`);

    expect(() => book.attach('h', '2026-10-05', 't10')).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
    // A tag that is on the day already is not "one more".
    expect(book.attach('h', '2026-10-05', 't0')).toHaveLength(10);
  });

  it('lists for a habit: its own use first, then overall, then name; with counts and last day', () => {
    const book = createTagBook([
      { id: 'a', name: 'a-here-once' },
      { id: 'b', name: 'b-elsewhere-twice' },
      { id: 'c', name: 'c-here-twice' },
      { id: 'd', name: 'd-unused' },
    ]);
    book.attach('h1', '2026-10-01', 'a');
    book.attach('h2', '2026-10-02', 'b');
    book.attach('h2', '2026-10-03', 'b');
    book.attach('h1', '2026-10-04', 'c');
    book.attach('h1', '2026-10-06', 'c');

    const list = book.list('h1');

    expect(list.map((tag) => tag.name)).toEqual([
      'c-here-twice',
      'a-here-once',
      'b-elsewhere-twice',
      'd-unused',
    ]);
    expect(list[0]).toMatchObject({ useCount: 2, habitUseCount: 2, lastUsedOn: '2026-10-06' });
    expect(list[3]).toMatchObject({ useCount: 0, habitUseCount: 0, lastUsedOn: null });
    expect(book.list()[0]?.habitUseCount).toBe(0);
  });

  it('merges on a rename to another tag’s name, whatever its case', () => {
    const book = createTagBook([
      { id: 'a', name: 'sick' },
      { id: 'b', name: 'Flu' },
    ]);
    book.attach('h', '2026-10-05', 'a');
    book.attach('h', '2026-10-06', 'a');
    book.attach('h', '2026-10-06', 'b');

    const result = book.rename('a', 'FLU');

    expect(result).toEqual({ id: 'b', name: 'Flu', merged: true });
    expect(book.tags.map((tag) => tag.name)).toEqual(['Flu']);
    expect(book.dayTags('h', '2026-10-05')).toEqual([{ id: 'b', name: 'Flu' }]);
    expect(book.dayTags('h', '2026-10-06')).toEqual([{ id: 'b', name: 'Flu' }]);
  });

  it('renames a tag to a new spelling of its own name without merging', () => {
    const book = createTagBook([{ id: 'a', name: 'sick' }]);

    expect(book.rename('a', 'Sick')).toEqual({ id: 'a', name: 'Sick', merged: false });
  });

  it('says on how many days a delete took effect, and answers 404 for a tag that is gone', () => {
    const book = createTagBook([{ id: 'a', name: 'sick' }]);
    book.attach('h', '2026-10-05', 'a');
    book.attach('h', '2026-10-06', 'a');

    expect(book.remove('a')).toEqual({ removedFromDays: 2 });
    expect(book.taggedDays('h', '2026-10-01', '2026-10-31')).toEqual([]);
    expect(() => book.remove('a')).toThrowError(expect.objectContaining({ status: 404 }));
  });

  it('lists a habit’s tagged days of a range, oldest first, and forgets them with the habit', () => {
    const book = createTagBook([{ id: 'a', name: 'sick' }]);
    book.attach('h', '2026-10-09', 'a');
    book.attach('h', '2026-10-02', 'a');
    book.attach('h', '2026-11-02', 'a');
    book.attach('other', '2026-10-05', 'a');

    expect(book.taggedDays('h', '2026-10-01', '2026-10-31').map((day) => day.date)).toEqual([
      '2026-10-02',
      '2026-10-09',
    ]);

    book.forgetHabit('h');
    expect(book.taggedDays('h', '2026-10-01', '2026-11-30')).toEqual([]);
    expect(book.taggedDays('other', '2026-10-01', '2026-10-31')).toHaveLength(1);
  });
});
