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
    onToggle: vi.fn(),
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
    };
    const arms = {
      id: 's-arms',
      title: 'Arms',
      weekdays: [1 as const, 3 as const],
      scheduledDates: ['2026-10-05', '2026-10-07', '2026-10-12'],
      completedDates: [],
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
});
