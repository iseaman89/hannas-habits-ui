import type { Schema } from '@/shared/api';

/** 1 (rough) to 5 (great); the number is the API's, the faces and words are the screen's. */
export type Mood = Schema<'Mood'>;

/** What the server sends for a day. */
export type DiaryDocument = Schema<'DailyDiaryDto'>;

/** What the server takes for a day. */
export type SaveDiaryRequest = Schema<'SaveDailyDiaryRequest'>;

/** The server's limits (backend `DiaryContent`); the inputs stop there so a save is never refused for length. */
export const DIARY_LIMITS = {
  highlight: 5000,
  entry: 200,
  taskTitle: 200,
  entriesPerList: 30,
  tasks: 50,
} as const;

/** A "grateful for" / "learnt" line. The `id` only gives the row a stable React key; it never leaves the client. */
export interface DraftEntry {
  id: string;
  text: string;
}

export interface DraftTask {
  id: string;
  title: string;
  done: boolean;
}

/**
 * The day as the person is editing it. Same fields as the server's document, with two
 * differences that suit a form: text is never `null` (blank = none), and list rows carry an id.
 * A row may be blank for a moment (the person emptied it and is about to type); `toRequest`
 * leaves such rows out.
 */
export interface DiaryDraft {
  mood: Mood | null;
  /** 0-100, `null` = not set. */
  body: number | null;
  mind: number | null;
  highlight: string;
  grateful: DraftEntry[];
  learned: DraftEntry[];
  tasks: DraftTask[];
}

let lastId = 0;

/** A key that is unique in this page's life, for a new row. */
export function newRowId(): string {
  lastId += 1;
  return `row-${lastId}`;
}

export function emptyDraft(): DiaryDraft {
  return {
    mood: null,
    body: null,
    mind: null,
    highlight: '',
    grateful: [],
    learned: [],
    tasks: [],
  };
}

/** A day without an entry (`null`, the server's 404) is the empty form. */
export function draftFromDocument(document: DiaryDocument | null): DiaryDraft {
  if (!document) return emptyDraft();

  const entries = (lines: readonly string[]): DraftEntry[] =>
    lines.map((text) => ({ id: newRowId(), text }));

  return {
    mood: document.mood,
    body: document.body,
    mind: document.mind,
    highlight: document.highlight ?? '',
    grateful: entries(document.grateful),
    learned: entries(document.learned),
    tasks: document.tasks.map(({ title, done }) => ({ id: newRowId(), title, done })),
  };
}

/**
 * The whole day as the server wants it. The server refuses a blank line in a list, so the lines
 * are trimmed and the blank ones left out here; a blank highlight is "none". Everything is sent
 * every time (`null` and `[]` included): the `PUT` replaces the day, and what is left out would
 * be cleared anyway - being explicit says so.
 */
export function toRequest(draft: DiaryDraft): SaveDiaryRequest {
  const lines = (entries: readonly DraftEntry[]) =>
    entries.map(({ text }) => text.trim()).filter((text) => text !== '');

  return {
    mood: draft.mood,
    body: draft.body,
    mind: draft.mind,
    highlight: draft.highlight.trim() || null,
    grateful: lines(draft.grateful),
    learned: lines(draft.learned),
    tasks: draft.tasks
      .map(({ title, done }) => ({ title: title.trim(), done }))
      .filter(({ title }) => title !== ''),
  };
}
