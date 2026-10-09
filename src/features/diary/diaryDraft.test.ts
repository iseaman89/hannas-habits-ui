import { describe, expect, it } from 'vitest';
import { diaryDay } from '@/test/fakeDiary';
import { draftFromDocument, emptyDraft, newRowId, toRequest, type DiaryDraft } from './diaryDraft';

const draft = (fields: Partial<DiaryDraft> = {}): DiaryDraft => ({ ...emptyDraft(), ...fields });
const entry = (text: string) => ({ id: newRowId(), text });
const task = (title: string, done = false) => ({ id: newRowId(), title, done });

describe('the draft of a day', () => {
  it('is the empty form for a day without an entry', () => {
    expect(draftFromDocument(null)).toEqual(emptyDraft());
  });

  it('takes every field of the server’s document', () => {
    const result = draftFromDocument(
      diaryDay('2026-10-07', {
        mood: 4,
        body: 0,
        mind: 80,
        highlight: 'A long walk',
        grateful: ['Sun', 'Coffee'],
        learned: ['Rust lifetimes'],
        tasks: [
          { title: 'Call mum', done: true },
          { title: 'Tax', done: false },
        ],
      }),
    );

    expect(result).toMatchObject({ mood: 4, body: 0, mind: 80, highlight: 'A long walk' });
    expect(result.grateful.map((line) => line.text)).toEqual(['Sun', 'Coffee']);
    expect(result.learned.map((line) => line.text)).toEqual(['Rust lifetimes']);
    expect(result.tasks.map(({ title, done }) => ({ title, done }))).toEqual([
      { title: 'Call mum', done: true },
      { title: 'Tax', done: false },
    ]);
  });

  it('shows a missing highlight as an empty text, never as null', () => {
    expect(draftFromDocument(diaryDay('2026-10-07', { highlight: null })).highlight).toBe('');
  });

  it('gives every row its own id, so React can tell the rows apart', () => {
    const result = draftFromDocument(
      diaryDay('2026-10-07', {
        grateful: ['a', 'a'],
        learned: ['a'],
        tasks: [{ title: 'a', done: false }],
      }),
    );

    const ids = [...result.grateful, ...result.learned, ...result.tasks].map((row) => row.id);
    expect(new Set(ids).size).toBe(4);
  });
});

describe('the request for a draft', () => {
  it('sends the whole day, with null and empty lists spelled out', () => {
    expect(toRequest(emptyDraft())).toEqual({
      mood: null,
      body: null,
      mind: null,
      highlight: null,
      grateful: [],
      learned: [],
      tasks: [],
    });
  });

  it('keeps a body of 0 - that is a value, not "not set"', () => {
    expect(toRequest(draft({ body: 0, mind: 0 }))).toMatchObject({ body: 0, mind: 0 });
  });

  it('trims the lines and leaves the blank ones out, because the server refuses blank lines', () => {
    const request = toRequest(
      draft({
        grateful: [entry('  Sun '), entry('   '), entry(''), entry('Coffee')],
        learned: [entry('\tTypes\n')],
        tasks: [task(' Call mum ', true), task('  '), task('Tax')],
      }),
    );

    expect(request.grateful).toEqual(['Sun', 'Coffee']);
    expect(request.learned).toEqual(['Types']);
    expect(request.tasks).toEqual([
      { title: 'Call mum', done: true },
      { title: 'Tax', done: false },
    ]);
  });

  it('keeps the order of the lines and of the tasks', () => {
    const request = toRequest(draft({ grateful: [entry('c'), entry('a'), entry('b')] }));

    expect(request.grateful).toEqual(['c', 'a', 'b']);
  });

  it('keeps the same text twice (the server does not mind duplicates)', () => {
    expect(toRequest(draft({ grateful: [entry('Sun'), entry('Sun')] })).grateful).toEqual([
      'Sun',
      'Sun',
    ]);
  });

  it('turns a blank highlight into none and trims a real one', () => {
    expect(toRequest(draft({ highlight: ' \n ' })).highlight).toBeNull();
    expect(toRequest(draft({ highlight: '  A walk\n\nand tea \n' })).highlight).toBe(
      'A walk\n\nand tea',
    );
  });

  it('does not send the row ids', () => {
    const request = toRequest(draft({ grateful: [entry('Sun')], tasks: [task('Tax')] }));

    expect(JSON.stringify(request)).not.toContain('row-');
  });
});
