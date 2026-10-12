import { describe, expect, it } from 'vitest';
import type { ApiError } from '@/shared/api';
import { recurrenceOf } from './recurrence';
import { fakeHabits, type FakeHabit } from './fakeHabits';

/**
 * The fake keeps the rules of the real server (B16) - the same facts the screens' tests lean on.
 * 2026-10-05 is a Monday, 2026-10-07 a Wednesday, 2026-10-09 a Friday.
 */
const sport = (overrides: Partial<FakeHabit> = {}): FakeHabit => ({
  id: 'sport',
  title: 'Sport',
  weekdays: [1, 3, 5],
  startDate: '2026-09-01',
  completed: [],
  ...overrides,
});

const range = { from: '2026-10-05', to: '2026-10-11', asOf: '2026-10-07' };

async function refusal(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('the call was accepted');
}

describe('fake habits: parts', () => {
  it('holds a part due where the habit is due and the weekday is its own, with its ticks', async () => {
    const habits = fakeHabits([
      sport({
        subHabits: [
          { id: 'legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
          { id: 'arms', title: 'Arms', weekdays: [1, 3, 6] },
        ],
      }),
    ]);

    const [overview] = await habits.gateway.overview(range);

    expect(overview?.subHabits).toEqual([
      {
        id: 'legs',
        title: 'Legs',
        weekdays: [1],
        scheduledDates: ['2026-10-05'],
        completedDates: ['2026-10-05'],
        notes: [],
      },
      {
        id: 'arms',
        title: 'Arms',
        weekdays: [1, 3, 6],
        // Saturday is the part's day, but not one of the habit's: never due.
        scheduledDates: ['2026-10-05', '2026-10-07'],
        completedDates: [],
        notes: [],
      },
    ]);
  });

  it('ticks the due parts with the habit and clears all of the day with an un-tick', async () => {
    const habits = fakeHabits([
      sport({
        subHabits: [
          { id: 'legs', title: 'Legs', weekdays: [1] },
          { id: 'arms', title: 'Arms', weekdays: [3] },
        ],
      }),
    ]);

    await habits.gateway.mark('sport', '2026-10-05');
    expect(habits.partsOf('sport').map((part) => part.completed)).toEqual([['2026-10-05'], []]);

    await habits.gateway.unmark('sport', '2026-10-05');
    expect(habits.partsOf('sport').map((part) => part.completed)).toEqual([[], []]);
  });

  it('completes the habit’s day with the last due part and takes it back with any due part', async () => {
    const habits = fakeHabits([
      sport({
        subHabits: [
          { id: 'legs', title: 'Legs', weekdays: [1] },
          { id: 'core', title: 'Core', weekdays: [1] },
        ],
      }),
    ]);

    await habits.gateway.markSubHabit('sport', 'legs', '2026-10-05');
    expect(habits.marksOf('sport')).toEqual([]);

    await habits.gateway.markSubHabit('sport', 'core', '2026-10-05');
    expect(habits.marksOf('sport')).toEqual(['2026-10-05']);

    await habits.gateway.unmarkSubHabit('sport', 'legs', '2026-10-05');
    expect(habits.marksOf('sport')).toEqual([]);
    expect(habits.partsOf('sport').map((part) => part.completed)).toEqual([[], ['2026-10-05']]);
  });

  it('keeps a tick on a day the part is not due on as a mark only', async () => {
    const habits = fakeHabits([
      sport({ subHabits: [{ id: 'legs', title: 'Legs', weekdays: [1] }] }),
    ]);

    await habits.gateway.markSubHabit('sport', 'legs', '2026-10-07'); // Wednesday

    expect(habits.partsOf('sport')[0]?.completed).toEqual(['2026-10-07']);
    expect(habits.marksOf('sport')).toEqual([]);
  });

  it('adds a part, answers with it and lists it in the details', async () => {
    const habits = fakeHabits([sport()]);

    const created = await habits.gateway.addSubHabit('sport', {
      title: '  Legs ',
      weekdays: [1, 5],
    });

    expect(created).toEqual({ id: 'part-1', title: 'Legs', weekdays: [1, 5] });
    expect((await habits.gateway.details('sport')).subHabits).toEqual([created]);
  });

  it('refuses a blank title and one over 150 characters, under the key `title`', async () => {
    const habits = fakeHabits([sport()]);

    const blank = await refusal(habits.gateway.addSubHabit('sport', { title: ' ', weekdays: [1] }));
    const long = await refusal(
      habits.gateway.addSubHabit('sport', { title: 'x'.repeat(151), weekdays: [1] }),
    );

    expect(blank).toMatchObject({ status: 400 });
    expect(blank.fieldErrors['title']).toHaveLength(1);
    expect(long.fieldErrors['title']).toHaveLength(1);
    await expect(
      habits.gateway.addSubHabit('sport', { title: 'x'.repeat(150), weekdays: [1] }),
    ).resolves.toMatchObject({ id: 'part-1' });
  });

  it('refuses a part without a weekday, under the key `weekdays`', async () => {
    const habits = fakeHabits([sport()]);

    const error = await refusal(
      habits.gateway.addSubHabit('sport', { title: 'Legs', weekdays: [] }),
    );

    expect(error.fieldErrors['weekdays']).toHaveLength(1);
  });

  it('refuses a title the habit has, ignoring case - and lets a rename keep its own', async () => {
    const habits = fakeHabits([
      sport({ subHabits: [{ id: 'legs', title: 'Legs', weekdays: [1] }] }),
    ]);

    const clash = await refusal(
      habits.gateway.addSubHabit('sport', { title: 'LEGS', weekdays: [3] }),
    );
    expect(clash).toMatchObject({ status: 400 });
    expect(clash.detail).toContain('already has a sub-habit');

    await expect(
      habits.gateway.updateSubHabit('sport', 'legs', { title: 'legs', weekdays: [1] }),
    ).resolves.toMatchObject({ title: 'legs' });
  });

  it('holds at most 10 parts', async () => {
    const habits = fakeHabits([sport()]);
    for (let n = 0; n < 10; n++) {
      await habits.gateway.addSubHabit('sport', { title: `Part ${n}`, weekdays: [1] });
    }

    const error = await refusal(
      habits.gateway.addSubHabit('sport', { title: 'One more', weekdays: [1] }),
    );

    expect(error).toMatchObject({ status: 400 });
    expect(error.detail).toContain('at most 10');
  });

  it('plans a part only on days the habit is planned on', async () => {
    const habits = fakeHabits([sport()]); // Mon, Wed, Fri

    const error = await refusal(
      habits.gateway.addSubHabit('sport', { title: 'Swim', weekdays: [1, 2] }),
    );

    expect(error.detail).toContain('days the habit itself is planned on');
  });

  it.each([
    ['every few days', { kind: 'everyNDays', interval: 3 } as const],
    ['a quota', { kind: 'timesPerWeek', times: 3 } as const],
  ])('lets a part of a habit with %s pick any weekday', async (_name, request) => {
    const habits = fakeHabits([
      sport({ weekdays: undefined, recurrence: recurrenceOf(request, '2026-09-01') }),
    ]);

    await expect(
      habits.gateway.addSubHabit('sport', { title: 'Swim', weekdays: [0, 2, 6] }),
    ).resolves.toMatchObject({ weekdays: [0, 2, 6] });
  });

  it('checks the weekdays only where they change, so a stranded part can be renamed', async () => {
    const habits = fakeHabits([
      // Tuesday is no day of the habit (any more), but the part still has it.
      sport({ subHabits: [{ id: 'swim', title: 'Swim', weekdays: [1, 2] }] }),
    ]);

    await expect(
      habits.gateway.updateSubHabit('sport', 'swim', { title: 'Swimming', weekdays: [1, 2] }),
    ).resolves.toMatchObject({ title: 'Swimming' });

    const error = await refusal(
      habits.gateway.updateSubHabit('sport', 'swim', { title: 'Swimming', weekdays: [2, 3] }),
    );
    expect(error.detail).toContain('days the habit itself is planned on');
  });

  it('removes a part with its ticks and does not mind one that is gone', async () => {
    const habits = fakeHabits([
      sport({
        subHabits: [{ id: 'legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] }],
      }),
    ]);

    await habits.gateway.removeSubHabit('sport', 'legs');
    await habits.gateway.removeSubHabit('sport', 'legs');

    expect(habits.partsOf('sport')).toEqual([]);
  });

  it('answers 404 for a tick on a part that is not there, and nothing for an un-tick', async () => {
    const habits = fakeHabits([sport()]);

    const error = await refusal(habits.gateway.markSubHabit('sport', 'gone', '2026-10-05'));

    expect(error).toMatchObject({ status: 404 });
    await expect(
      habits.gateway.unmarkSubHabit('sport', 'gone', '2026-10-05'),
    ).resolves.toBeUndefined();
  });

  it('writes the ticks of parts into the same log as the habit’s own, in the order of the calls', async () => {
    const habits = fakeHabits([
      sport({ subHabits: [{ id: 'legs', title: 'Legs', weekdays: [1] }] }),
    ]);

    await habits.gateway.markSubHabit('sport', 'legs', '2026-10-05');
    await habits.gateway.unmark('sport', '2026-10-05');

    expect(habits.calls.marks).toEqual([
      'mark-part sport legs 2026-10-05',
      'unmark sport 2026-10-05',
    ]);
  });

  describe('notes', () => {
    const legsHabit = () =>
      fakeHabits([
        sport({
          subHabits: [
            { id: 'legs', title: 'Legs', weekdays: [1], notes: { '2026-10-05': 'knee odd' } },
            { id: 'arms', title: 'Arms', weekdays: [3] },
          ],
        }),
      ]);

    it('carries the notes of the range on their part, oldest first, and leaves the others out', async () => {
      const habits = fakeHabits([
        sport({
          subHabits: [
            {
              id: 'legs',
              title: 'Legs',
              weekdays: [1],
              notes: { '2026-10-12': 'next week', '2026-10-05': 'first', '2026-09-28': 'before' },
            },
          ],
        }),
      ]);

      const [overview] = await habits.gateway.overview({ ...range, to: '2026-10-31' });

      expect(overview?.subHabits[0]?.notes).toEqual([
        { date: '2026-10-05', text: 'first' },
        { date: '2026-10-12', text: 'next week' },
      ]);
    });

    it('writes a note trimmed, replaces the text of the day and answers with it', async () => {
      const habits = legsHabit();

      const answer = await habits.gateway.setSubHabitNote(
        'sport',
        'legs',
        '2026-10-05',
        '  3 x 10 ',
      );

      expect(answer).toEqual({ date: '2026-10-05', text: '3 x 10' });
      expect(habits.notesOf('sport', 'legs')).toEqual([{ date: '2026-10-05', text: '3 x 10' }]);
    });

    it('takes a note away, and does not mind a day without one or a part that is gone', async () => {
      const habits = legsHabit();

      await habits.gateway.clearSubHabitNote('sport', 'legs', '2026-10-05');
      await habits.gateway.clearSubHabitNote('sport', 'legs', '2026-10-05');
      await habits.gateway.clearSubHabitNote('sport', 'gone', '2026-10-05');

      expect(habits.notesOf('sport', 'legs')).toEqual([]);
    });

    it('refuses a blank or too long text with a 400 on `text`, and a part that is not there with 404', async () => {
      const habits = legsHabit();

      const blank = await refusal(
        habits.gateway.setSubHabitNote('sport', 'legs', '2026-10-05', '  '),
      );
      const long = await refusal(
        habits.gateway.setSubHabitNote('sport', 'legs', '2026-10-06', 'a'.repeat(501)),
      );
      const gone = await refusal(
        habits.gateway.setSubHabitNote('sport', 'gone', '2026-10-05', 'x'),
      );

      expect(blank).toMatchObject({ status: 400 });
      expect(Object.keys(blank.fieldErrors)).toEqual(['text']);
      expect(long).toMatchObject({ status: 400 });
      expect(Object.keys(long.fieldErrors)).toEqual(['text']);
      expect(gone).toMatchObject({ status: 404 });
      expect(habits.notesOf('sport', 'legs')).toEqual([{ date: '2026-10-05', text: 'knee odd' }]);
    });

    it('is independent of the ticks: a tick and its taking back leave the note', async () => {
      const habits = legsHabit();

      await habits.gateway.markSubHabit('sport', 'legs', '2026-10-05');
      await habits.gateway.unmark('sport', '2026-10-05');

      expect(habits.notesOf('sport', 'legs')).toEqual([{ date: '2026-10-05', text: 'knee odd' }]);
    });

    it('goes with the part', async () => {
      const habits = legsHabit();

      await habits.gateway.removeSubHabit('sport', 'legs');

      expect(habits.notesOf('sport', 'legs')).toEqual([]);
    });

    it('writes the calls down in the order the server saw them', async () => {
      const habits = legsHabit();

      await habits.gateway.setSubHabitNote('sport', 'legs', '2026-10-06', 'one');
      await habits.gateway.clearSubHabitNote('sport', 'legs', '2026-10-06');

      expect(habits.calls.notes).toEqual([
        'set sport legs 2026-10-06 one',
        'clear sport legs 2026-10-06',
      ]);
    });
  });
});
