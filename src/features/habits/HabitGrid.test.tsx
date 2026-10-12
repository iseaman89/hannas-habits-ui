import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HabitGrid } from './HabitGrid';
import { isDue, weeklyRecurrence, type Recurrence } from '@/test/recurrence';
import type { HabitOverview } from './habitsGateway';

// What the server would answer in `scheduledDates` for October 2026: the days the rule makes due,
// none before the start.
const OCTOBER = Array.from(
  { length: 31 },
  (_, index) => `2026-10-${String(index + 1).padStart(2, '0')}`,
);
const dueDays = (rule: Recurrence, startDate: string) =>
  OCTOBER.filter((day) => day >= startDate && isDue(rule, day));

const everyDay = weeklyRecurrence([0, 1, 2, 3, 4, 5, 6]);
const monWedFri = weeklyRecurrence([1, 3, 5]);

const stretch: HabitOverview = {
  id: 'h-1',
  title: 'Stretch',
  recurrence: everyDay,
  startDate: '2026-10-01',
  scheduledDates: dueDays(everyDay, '2026-10-01'),
  completedDates: ['2026-10-05'],
  taggedDays: [],
  quotaPeriods: [],
  currentStreak: 4,
  subHabits: [],
};

const read: HabitOverview = {
  id: 'h-2',
  title: 'Read',
  recurrence: monWedFri,
  startDate: '2026-10-01',
  scheduledDates: dueDays(monWedFri, '2026-10-01'),
  completedDates: [],
  taggedDays: [],
  quotaPeriods: [],
  currentStreak: 0,
  subHabits: [],
};

const gymRule = { ...weeklyRecurrence([]), kind: 'timesPerWeek' as const, times: 3 };
const callRule = { ...weeklyRecurrence([]), kind: 'timesPerMonth' as const, times: 2 };

/** "3 times a week": every day from the start can be ticked, the week of 5 - 11 October has 2. */
const gym: HabitOverview = {
  id: 'h-3',
  title: 'Gym',
  recurrence: gymRule,
  startDate: '2026-10-01',
  scheduledDates: OCTOBER,
  completedDates: ['2026-10-05', '2026-10-06'],
  taggedDays: [],
  quotaPeriods: [
    { from: '2026-09-28', to: '2026-10-04', done: 1 },
    { from: '2026-10-05', to: '2026-10-11', done: 2 },
    { from: '2026-10-12', to: '2026-10-18', done: 0 },
    { from: '2026-10-19', to: '2026-10-25', done: 0 },
    { from: '2026-10-26', to: '2026-11-01', done: 0 },
  ],
  currentStreak: 3,
  subHabits: [],
};

const phone: HabitOverview = {
  ...gym,
  id: 'h-4',
  title: 'Call home',
  recurrence: callRule,
  quotaPeriods: [{ from: '2026-10-01', to: '2026-10-31', done: 1 }],
  currentStreak: 1,
};

function renderGrid(overrides: Partial<Parameters<typeof HabitGrid>[0]> = {}) {
  const handlers = {
    onToggleExpanded: vi.fn(),
    onToggle: vi.fn(),
    onTogglePart: vi.fn(),
    onNote: vi.fn(),
    onDayParts: vi.fn(),
    onParts: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <HabitGrid
      habits={[stretch, read]}
      month={new Date(2026, 9, 1)}
      today="2026-10-07"
      expandedHabitIds={new Set()}
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
}

describe('HabitGrid', () => {
  describe('opening a month', () => {
    // jsdom lays nothing out, so the measures come from the test: a names column of 128 px, day
    // columns of 36 px behind it, and a box of 328 px (200 px of room beside the names).
    const columnOf = (header: HTMLElement) =>
      Array.from(header.parentElement?.children ?? []).indexOf(header);

    beforeEach(() => {
      vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.tagName === 'TH' ? (columnOf(this) === 0 ? 128 : 36) : 0;
      });
      vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.tagName !== 'TH') return 0;
        const column = columnOf(this);
        return column === 0 ? 0 : 128 + (column - 1) * 36;
      });
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.classList.contains('overflow-x-auto') ? 328 : 0;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const scroller = () => screen.getByRole('table').parentElement!;

    it('scrolls to today, so that on a phone the day that matters is in view', () => {
      renderGrid(); // today is the 7th: its column starts at 128 + 6 * 36 = 344

      // Seen at 344 - scrollLeft = 128 + (200 - 36) / 2 = 210, the middle of the free room.
      expect(scroller().scrollLeft).toBe(134);
    });

    it('stays at the start in a month that does not have today', () => {
      renderGrid({ month: new Date(2026, 8, 1) });

      expect(scroller().scrollLeft).toBe(0);
    });
  });

  it.each([
    [new Date(2026, 1, 1), 28],
    [new Date(2028, 1, 1), 29],
    [new Date(2026, 3, 1), 30],
    [new Date(2026, 9, 1), 31],
  ])('has a column for each day of the month (%s: %i days)', (month, days) => {
    renderGrid({ month, habits: [] });

    // + the habit column and the streak column
    expect(screen.getAllByRole('columnheader')).toHaveLength(days + 2);
  });

  it('keeps the day names for screen readers inside its own scrolling', () => {
    renderGrid();

    // They are `sr-only` (absolutely positioned): without a positioned scroller they would not be
    // clipped, and a column at the far right would make the whole page wider than a phone.
    expect(screen.getByRole('table').parentElement).toHaveClass('relative', 'overflow-x-auto');
  });

  it('names the table by its month', () => {
    renderGrid();

    expect(screen.getByRole('table', { name: 'Habits in October 2026' })).toBeInTheDocument();
  });

  it('shows each habit with its plan and its streak', () => {
    renderGrid();

    const row = screen.getByRole('rowheader', { name: /^Stretch/ }).closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('Every day');
    expect(within(row).getByRole('img', { name: 'Current streak: 4' })).toBeInTheDocument();
  });

  it('hands over what a cell should become: done for an open day, open for a done one', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Stretch, Wed 7 Oct' }));
    await user.click(screen.getByRole('button', { name: 'Stretch, Mon 5 Oct' }));

    expect(onToggle).toHaveBeenNthCalledWith(1, stretch, '2026-10-07', true);
    expect(onToggle).toHaveBeenNthCalledWith(2, stretch, '2026-10-05', false);
  });

  it('offers no button for a day that must not be ticked', () => {
    renderGrid();

    // tomorrow, a day outside the plan
    expect(screen.queryByRole('button', { name: 'Stretch, Thu 8 Oct' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Read, Tue 6 Oct' })).not.toBeInTheDocument();
  });

  it('passes the habit on to edit and delete', async () => {
    const user = userEvent.setup();
    const { onEdit, onDelete } = renderGrid();

    await user.click(screen.getByRole('button', { name: 'Edit Read' }));
    await user.click(screen.getByRole('button', { name: 'Delete Stretch' }));

    expect(onEdit).toHaveBeenCalledWith(read);
    expect(onDelete).toHaveBeenCalledWith(stretch);
  });

  it('draws the days the server lists as due, not the days of the weekday list', () => {
    // The weekday list says every day, the server says only the 9th: the server is the rule.
    renderGrid({ habits: [{ ...stretch, scheduledDates: ['2026-10-09'], completedDates: [] }] });

    expect(
      screen.getByRole('img', { name: 'Stretch, Tue 6 Oct: not scheduled' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Stretch, Fri 9 Oct: upcoming' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stretch, Tue 6 Oct' })).not.toBeInTheDocument();
  });

  it('still calls a day before the start "before the habit started" when it is not due either', () => {
    renderGrid({ habits: [{ ...read, startDate: '2026-10-05', scheduledDates: ['2026-10-07'] }] });

    expect(
      screen.getByRole('img', { name: 'Read, Fri 2 Oct: before the habit started' }),
    ).toBeInTheDocument();
  });

  it.each<[string, Recurrence, string]>([
    [
      'every other week',
      { ...weeklyRecurrence([1, 4]), interval: 2, anchor: '2026-10-05' },
      'Every 2nd week on Mon and Thu',
    ],
    [
      'every 3rd day',
      { ...weeklyRecurrence([]), kind: 'everyNDays', interval: 3, anchor: '2026-10-01' },
      'Every 3rd day',
    ],
    [
      'the last Saturday',
      { ...weeklyRecurrence([]), kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 },
      'Last Saturday of the month',
    ],
    [
      'the 15th',
      { ...weeklyRecurrence([]), kind: 'monthlyOnDate', dayOfMonth: 15 },
      'On the 15th of the month',
    ],
  ])('names the rule under the habit: %s', (_name, recurrence, label) => {
    renderGrid({ habits: [{ ...read, recurrence, scheduledDates: [] }] });

    const row = screen.getByRole('rowheader', { name: /^Read/ }).closest('tr') as HTMLElement;
    expect(within(row).getByText(label)).toBeInTheDocument();
  });

  it('ignores a mark on a day that is not planned, instead of drawing it', () => {
    renderGrid({ habits: [{ ...read, completedDates: ['2026-10-06'] }] }); // a Tuesday

    expect(screen.getByRole('img', { name: 'Read, Tue 6 Oct: not scheduled' })).toBeInTheDocument();
  });

  describe('parts of a habit', () => {
    // Mon, Wed, Fri habit with two parts: legs on Mondays, arms on Mondays and Wednesdays.
    const legs = {
      id: 's-legs',
      title: 'Legs',
      weekdays: [1 as const],
      scheduledDates: ['2026-10-05', '2026-10-12'],
      completedDates: ['2026-10-05'],
      notes: [],
    };
    const arms = {
      id: 's-arms',
      title: 'Arms',
      weekdays: [1 as const, 3 as const],
      scheduledDates: ['2026-10-05', '2026-10-07', '2026-10-12'],
      completedDates: [],
      notes: [],
    };
    const withParts: HabitOverview = { ...read, subHabits: [legs, arms] };
    const rowOfRead = () =>
      screen.getByRole('rowheader', { name: /^Read/ }).closest('tr') as HTMLElement;

    it('shows how far the day’s parts have come, under the days they are due', () => {
      renderGrid({ habits: [withParts] });

      const row = rowOfRead();
      expect(
        within(row).getByRole('button', { name: 'Parts, Read, Mon 5 Oct: 1 of 2 done' }),
      ).toHaveTextContent('1/2');
      expect(
        within(row).getByRole('button', { name: 'Parts, Read, Wed 7 Oct: 0 of 1 done' }),
      ).toHaveTextContent('0/1');
      // Two Mondays and one Wednesday: nothing under any other day, and Friday has no part.
      expect(within(row).getAllByRole('button', { name: /^Parts, / })).toHaveLength(3);
    });

    it('shows nothing under the days of a habit without parts', () => {
      renderGrid();

      expect(screen.queryByRole('button', { name: /^Parts, / })).not.toBeInTheDocument();
    });

    it('opens the day’s parts, and keeps that apart from ticking the day', async () => {
      const user = userEvent.setup();
      const { onDayParts, onToggle } = renderGrid({ habits: [withParts] });

      await user.click(screen.getByRole('button', { name: 'Parts, Read, Wed 7 Oct: 0 of 1 done' }));

      expect(onDayParts).toHaveBeenCalledOnce();
      expect(onDayParts).toHaveBeenCalledWith(withParts, '2026-10-07');
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('says how many parts a habit has, after its rule', () => {
      renderGrid({ habits: [withParts] });

      expect(within(rowOfRead()).getByText('Mon · Wed · Fri · 2 parts')).toBeInTheDocument();
    });

    it('offers the parts of every habit, also one that has none yet', async () => {
      const user = userEvent.setup();
      const { onParts } = renderGrid();

      await user.click(screen.getByRole('button', { name: 'Parts of Read' }));

      expect(onParts).toHaveBeenCalledWith(read);
    });

    describe('as rows of their own', () => {
      const open = new Set([withParts.id]);
      const rowOf = (name: RegExp) => screen.getByRole('rowheader', { name }).closest('tr')!;

      it('offers to show the parts of a habit that has some, and of no other', () => {
        renderGrid({ habits: [withParts, stretch] });

        expect(screen.getByRole('button', { name: 'Show parts of Read' })).toHaveAttribute(
          'aria-expanded',
          'false',
        );
        expect(screen.queryByRole('button', { name: /^(Show|Hide) parts of Stretch$/ })).toBeNull();
      });

      it('asks for the habit to be opened, and ticks nothing by it', async () => {
        const user = userEvent.setup();
        const { onToggleExpanded, onToggle } = renderGrid({ habits: [withParts] });

        await user.click(screen.getByRole('button', { name: 'Show parts of Read' }));

        expect(onToggleExpanded).toHaveBeenCalledWith(withParts);
        expect(onToggle).not.toHaveBeenCalled();
      });

      it('has no row for a part while the habit is closed', () => {
        renderGrid({ habits: [withParts] });

        expect(screen.getAllByRole('row')).toHaveLength(2); // the days and the habit
        expect(screen.queryByRole('rowheader', { name: /^Legs/ })).not.toBeInTheDocument();
      });

      it('shows a row per part right under the open habit, in the order the parts have', () => {
        renderGrid({ habits: [withParts], expandedHabitIds: open });

        expect(screen.getByRole('button', { name: 'Hide parts of Read' })).toHaveAttribute(
          'aria-expanded',
          'true',
        );
        const rows = screen.getAllByRole('row');
        expect(rows).toHaveLength(4);
        expect(rows[1]).toHaveTextContent(/^Read/);
        expect(within(rows[2]!).getByRole('rowheader', { name: 'Legs of Read Mon' })).toBeVisible();
        expect(
          within(rows[3]!).getByRole('rowheader', { name: 'Arms of Read Mon · Wed' }),
        ).toBeVisible();
      });

      it('draws a part by its own days and its own ticks, not by the habit’s', () => {
        renderGrid({ habits: [withParts], expandedHabitIds: open });

        const legs = within(rowOf(/^Legs/));
        expect(legs.getByRole('button', { name: 'Read: Legs, Mon 5 Oct' })).toHaveAttribute(
          'aria-pressed',
          'true',
        );
        // Wednesday is a day of the habit, but not of Legs; the 12th is to come.
        expect(
          legs.getByRole('img', { name: 'Read: Legs, Wed 7 Oct: not scheduled' }),
        ).toBeVisible();
        expect(legs.getByRole('img', { name: 'Read: Legs, Mon 12 Oct: upcoming' })).toBeVisible();
        const arms = within(rowOf(/^Arms/));
        expect(arms.getByRole('button', { name: 'Read: Arms, Wed 7 Oct' })).toHaveAttribute(
          'aria-pressed',
          'false',
        );
      });

      it('ticks a part on its own day - the part, not the habit', async () => {
        const user = userEvent.setup();
        const { onTogglePart, onToggle } = renderGrid({
          habits: [withParts],
          expandedHabitIds: open,
        });

        await user.click(screen.getByRole('button', { name: 'Read: Arms, Wed 7 Oct' }));
        await user.click(screen.getByRole('button', { name: 'Read: Legs, Mon 5 Oct' }));

        expect(onTogglePart).toHaveBeenNthCalledWith(1, withParts, arms, '2026-10-07', true);
        expect(onTogglePart).toHaveBeenNthCalledWith(2, withParts, legs, '2026-10-05', false);
        expect(onToggle).not.toHaveBeenCalled();
      });

      it('leaves out the summary under the days: the rows say it', () => {
        renderGrid({ habits: [withParts], expandedHabitIds: open });

        expect(screen.queryByRole('button', { name: /^Parts, / })).not.toBeInTheDocument();
      });

      it('shows nothing extra for a habit that has no parts, whatever was open', () => {
        renderGrid({ habits: [stretch], expandedHabitIds: new Set([stretch.id]) });

        expect(screen.getAllByRole('row')).toHaveLength(2);
      });
    });
  });

  describe('a quota habit ("3 times a week")', () => {
    const rowOfGym = () =>
      screen.getByRole('rowheader', { name: /^Gym/ }).closest('tr') as HTMLElement;

    it('says the rule and how far this week has come, under the name', () => {
      renderGrid({ habits: [gym] });

      expect(within(rowOfGym()).getByText('3 times a week · 2 of 3 this week')).toBeInTheDocument();
    });

    it('says how far this month has come for "times a month"', () => {
      renderGrid({ habits: [phone] });

      expect(screen.getByText('Twice a month · 1 of 2 this month')).toBeInTheDocument();
    });

    it('leaves the progress out when the answer does not hold the period of today', () => {
      // A month in the past: the server answered with its weeks, and none of them is today's.
      const august = { ...gym, quotaPeriods: [{ from: '2026-08-03', to: '2026-08-09', done: 1 }] };
      renderGrid({ habits: [august], month: new Date(2026, 7, 1), today: '2026-10-07' });

      expect(screen.getByText('3 times a week')).toBeInTheDocument();
      expect(screen.queryByText(/this week/)).not.toBeInTheDocument();
    });

    it('lets every past day be ticked, and never calls one missed', async () => {
      const user = userEvent.setup();
      const { onToggle } = renderGrid({ habits: [gym] });

      const pastOpen = within(rowOfGym()).getByRole('button', { name: 'Gym, Fri 2 Oct' });
      expect(pastOpen).toHaveAttribute('aria-pressed', 'false');
      expect(within(rowOfGym()).queryByRole('img', { name: /missed/ })).not.toBeInTheDocument();

      await user.click(pastOpen);

      expect(onToggle).toHaveBeenCalledWith(gym, '2026-10-02', true);
    });

    it('draws today as open - not as due - and days to come as upcoming', () => {
      renderGrid({ habits: [gym] }); // today is Wed 7 October

      expect(within(rowOfGym()).getByRole('button', { name: 'Gym, Wed 7 Oct' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      expect(
        within(rowOfGym()).getByRole('img', { name: 'Gym, Thu 8 Oct: upcoming' }),
      ).toBeInTheDocument();
    });

    it('shows the streak in weeks, and in months for a monthly count', () => {
      renderGrid({ habits: [gym, phone] });

      expect(screen.getByRole('img', { name: 'Current streak: 3 weeks' })).toHaveTextContent('3wk');
      expect(screen.getByRole('img', { name: 'Current streak: 1 month' })).toHaveTextContent('1mo');
    });

    it('keeps the streak of a habit with due days in days, with no unit written', () => {
      renderGrid({ habits: [stretch] });

      expect(screen.getByRole('img', { name: 'Current streak: 4' })).toHaveTextContent(/^4$/);
    });
  });

  describe('notes on the parts’ days', () => {
    // Mon, Wed, Fri habit; legs on Mondays with a note on Monday 5 October, arms on Mondays and
    // Wednesdays without any.
    const legs = {
      id: 's-legs',
      title: 'Legs',
      weekdays: [1 as const],
      scheduledDates: ['2026-10-05', '2026-10-12'],
      completedDates: ['2026-10-05'],
      notes: [{ date: '2026-10-05', text: '3 x 10\nleft knee odd' }],
    };
    const arms = {
      id: 's-arms',
      title: 'Arms',
      weekdays: [1 as const, 3 as const],
      scheduledDates: ['2026-10-05', '2026-10-07', '2026-10-12'],
      completedDates: [],
      notes: [],
    };
    const sport: HabitOverview = { ...read, subHabits: [legs, arms] };
    const open = new Set(['h-2']);
    const rowOfRead = () =>
      screen.getByRole('rowheader', { name: /^Read/ }).closest('tr') as HTMLElement;
    const rowOfPart = (title: string) =>
      screen.getByRole('rowheader', { name: new RegExp(`^${title}`) }).closest('tr') as HTMLElement;

    describe('on the habit’s own cell', () => {
      it('names the parts that have a note that day and writes the note under each name', async () => {
        const user = userEvent.setup();
        const notedArms = { ...arms, notes: [{ date: '2026-10-05', text: 'bench 3 x 8' }] };
        renderGrid({ habits: [{ ...sport, subHabits: [legs, notedArms] }] });

        await user.hover(within(rowOfRead()).getByRole('button', { name: /^Read, Mon 5 Oct/ }));

        const card = await screen.findByRole('group', { name: 'Parts, Read, Mon 5 Oct' });
        const parts = within(card).getAllByRole('listitem');
        expect(parts).toHaveLength(2);
        expect(parts[0]).toHaveTextContent('Legs');
        expect(parts[0]).toHaveTextContent(/3 x 10\s*left knee odd/);
        expect(parts[1]).toHaveTextContent('Arms');
        expect(parts[1]).toHaveTextContent('bench 3 x 8');
      });

      it('leaves a part without a note out of the card', async () => {
        const user = userEvent.setup();
        renderGrid({ habits: [sport] }); // Monday: legs has a note, arms is due without one

        await user.hover(within(rowOfRead()).getByRole('button', { name: /^Read, Mon 5 Oct/ }));

        const card = await screen.findByRole('group', { name: 'Parts, Read, Mon 5 Oct' });
        expect(within(card).getAllByRole('listitem')).toHaveLength(1);
        expect(card).toHaveTextContent('Legs');
        expect(card).not.toHaveTextContent('Arms');
      });

      it('shows no card at all on a day whose parts have no note', async () => {
        const user = userEvent.setup();
        renderGrid({ habits: [sport] });

        // Wednesday 7 October: arms is due, nobody wrote on it.
        await user.hover(within(rowOfRead()).getByRole('button', { name: 'Read, Wed 7 Oct' }));
        await new Promise((resolve) => setTimeout(resolve, 450));

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
      });

      it('shows no card on a day without parts, nor on a habit without any', async () => {
        const user = userEvent.setup();
        renderGrid({ habits: [sport, stretch] });

        // Friday 9 October is a day to come: a picture, not a button.
        await user.hover(
          within(rowOfRead()).getByRole('img', { name: 'Read, Fri 9 Oct: upcoming' }),
        );
        await user.hover(screen.getByRole('button', { name: 'Stretch, Mon 5 Oct' }));
        await new Promise((resolve) => setTimeout(resolve, 450));

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
      });

      it('also shows a note on a day the part is not due on', async () => {
        const user = userEvent.setup();
        const stray = { ...arms, notes: [{ date: '2026-10-09', text: 'stretched instead' }] };
        renderGrid({ habits: [{ ...sport, subHabits: [legs, stray] }] });

        await user.hover(
          within(rowOfRead()).getByRole('img', { name: /^Read, Fri 9 Oct: upcoming/ }),
        );

        const card = await screen.findByRole('group', { name: 'Parts, Read, Fri 9 Oct' });
        expect(card).toHaveTextContent('Arms');
        expect(card).toHaveTextContent('stretched instead');
      });

      it('lets a screen reader hear the notes of the day after the cell’s name', () => {
        renderGrid({ habits: [sport] });

        expect(
          within(rowOfRead()).getByRole('button', {
            name: 'Read, Mon 5 Oct. Note: Legs: 3 x 10\nleft knee odd',
          }),
        ).toBeInTheDocument();
        // A day without a note keeps its plain name.
        expect(
          within(rowOfRead()).getByRole('button', { name: 'Read, Wed 7 Oct' }),
        ).toBeInTheDocument();
      });
    });

    describe('on a part’s own cell', () => {
      it('opens a field with the note of the day, named by part and day', async () => {
        const user = userEvent.setup();
        renderGrid({ habits: [sport], expandedHabitIds: open });

        await user.hover(
          within(rowOfPart('Legs')).getByRole('button', { name: /^Read: Legs, Mon 5 Oct/ }),
        );

        const field = await screen.findByRole('textbox', { name: 'Note for Legs, Mon 5 Oct' });
        expect(field).toHaveValue('3 x 10\nleft knee odd');
      });

      it('writes the trimmed text when the field is left, and only then and for the change', async () => {
        const user = userEvent.setup();
        const { onNote } = renderGrid({ habits: [sport], expandedHabitIds: open });

        await user.hover(
          within(rowOfPart('Arms')).getByRole('button', { name: /^Read: Arms, Mon 5 Oct/ }),
        );
        const field = await screen.findByRole('textbox', { name: 'Note for Arms, Mon 5 Oct' });
        await user.type(field, '  bench 3 x 8 ');
        expect(onNote).not.toHaveBeenCalled(); // still typing

        await user.tab();

        expect(onNote).toHaveBeenCalledTimes(1);
        expect(onNote).toHaveBeenCalledWith(sport, arms, '2026-10-05', 'bench 3 x 8');
      });

      it('takes the note away when the field is emptied', async () => {
        const user = userEvent.setup();
        const { onNote } = renderGrid({ habits: [sport], expandedHabitIds: open });

        await user.hover(
          within(rowOfPart('Legs')).getByRole('button', { name: /^Read: Legs, Mon 5 Oct/ }),
        );
        await user.clear(await screen.findByRole('textbox', { name: 'Note for Legs, Mon 5 Oct' }));
        await user.tab();

        expect(onNote).toHaveBeenCalledWith(sport, legs, '2026-10-05', null);
      });

      it('has no field on a day that is not the part’s and has no note', async () => {
        const user = userEvent.setup();
        renderGrid({ habits: [sport], expandedHabitIds: open });

        // Legs is a Monday part: Wednesday is a dot.
        await user.hover(
          within(rowOfPart('Legs')).getByRole('img', { name: /Wed 7 Oct: not scheduled/ }),
        );
        await new Promise((resolve) => setTimeout(resolve, 450));

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
      });

      it('has a field on a day that is not the part’s but carries a note, so it can be read and changed', async () => {
        const user = userEvent.setup();
        const stray = { ...legs, notes: [{ date: '2026-10-07', text: 'went anyway' }] };
        renderGrid({ habits: [{ ...sport, subHabits: [stray, arms] }], expandedHabitIds: open });

        await user.hover(
          within(rowOfPart('Legs')).getByRole('img', {
            name: /Wed 7 Oct: not scheduled\. Note: went anyway/,
          }),
        );

        expect(
          await screen.findByRole('textbox', { name: 'Note for Legs, Wed 7 Oct' }),
        ).toHaveValue('went anyway');
      });

      it('has no field on a day before the habit started', async () => {
        const user = userEvent.setup();
        const late = { ...sport, startDate: '2026-10-06' };
        renderGrid({ habits: [late], expandedHabitIds: open });

        await user.hover(
          within(rowOfPart('Legs')).getByRole('img', {
            name: /Mon 5 Oct: before the habit started/,
          }),
        );
        await new Promise((resolve) => setTimeout(resolve, 450));

        expect(screen.queryByRole('group')).not.toBeInTheDocument();
      });

      it('still ticks the part with a click, the note does not take the cell over', async () => {
        const user = userEvent.setup();
        const { onTogglePart } = renderGrid({ habits: [sport], expandedHabitIds: open });

        await user.click(
          within(rowOfPart('Arms')).getByRole('button', { name: /^Read: Arms, Mon 5 Oct/ }),
        );

        expect(onTogglePart).toHaveBeenCalledWith(sport, arms, '2026-10-05', true);
      });
    });
  });
});
