import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HabitGrid } from './HabitGrid';
import type { HabitOverview } from './habitsGateway';

const stretch: HabitOverview = {
  id: 'h-1',
  title: 'Stretch',
  schedule: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-10-01',
  completedDates: ['2026-10-05'],
  currentStreak: 4,
};

const read: HabitOverview = {
  id: 'h-2',
  title: 'Read',
  schedule: [1, 3, 5],
  startDate: '2026-10-01',
  completedDates: [],
  currentStreak: 0,
};

function renderGrid(overrides: Partial<Parameters<typeof HabitGrid>[0]> = {}) {
  const handlers = { onToggle: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
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

  it('ignores a mark on a day that is not planned, instead of drawing it', () => {
    renderGrid({ habits: [{ ...read, completedDates: ['2026-10-06'] }] }); // a Tuesday

    expect(screen.getByRole('img', { name: 'Read, Tue 6 Oct: not scheduled' })).toBeInTheDocument();
  });
});
