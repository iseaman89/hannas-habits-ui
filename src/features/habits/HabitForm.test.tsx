import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiError } from '@/test/problems';
import { emptyHabit, type HabitValues } from './habitSchema';
import type { HabitInput } from './habitsGateway';
import { HabitForm } from './HabitForm';
import { DEFAULT_RECURRENCE, type RecurrenceValues } from './recurrenceSchema';
import type { DayOfWeek } from './weekdays';

// The client's "today" in these tests.
const EMPTY_HABIT = emptyHabit('2026-10-07');

/** The form's rule, with only what a test cares about changed. */
const rule = (changes: Partial<RecurrenceValues>): RecurrenceValues => ({
  ...DEFAULT_RECURRENCE,
  ...changes,
});
const weekly = (weekdays: DayOfWeek[]) => rule({ weekdays });

function renderForm(
  options: {
    initial?: HabitValues;
    onSubmit?: (input: HabitInput) => Promise<unknown>;
    editing?: boolean;
  } = {},
) {
  const onSubmit = options.onSubmit ?? vi.fn(() => Promise.resolve());
  const onCancel = vi.fn();
  render(
    <HabitForm
      initial={options.initial ?? EMPTY_HABIT}
      submitLabel="Add habit"
      onSubmit={onSubmit}
      onCancel={onCancel}
      editing={options.editing}
    />,
  );
  return { onSubmit, onCancel };
}

const title = () => screen.getByLabelText('What do you want to do?');
const day = (name: string) => screen.getByRole('button', { name });
const startDate = () => screen.getByLabelText('Starts on');
const submitButton = () => screen.getByRole('button', { name: /^Add habit/ });
const repeat = () => screen.getByLabelText('Repeat');

describe('HabitForm', () => {
  it('starts as an every-day habit and cannot be sent without a name', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(submitButton()).toHaveTextContent('Add habit · 7×/week');
    expect(submitButton()).toBeDisabled();

    await user.type(title(), '   ');
    expect(submitButton()).toBeDisabled();

    await user.type(title(), 'Stretch');
    expect(submitButton()).toBeEnabled();
  });

  it('turns single days on and off, Monday first, and counts them', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initial: { ...EMPTY_HABIT, title: 'Stretch', recurrence: weekly([1]) },
    });

    expect(day('Monday')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Tuesday')).toHaveAttribute('aria-pressed', 'false');

    await user.click(day('Sunday'));
    await user.click(day('Wednesday'));

    expect(submitButton()).toHaveTextContent('Add habit · 3×/week');
    const names = screen
      .getAllByRole('button', { pressed: true })
      .map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names).toEqual(['Monday', 'Wednesday', 'Sunday']);

    await user.click(submitButton());
    // Sent in the order of the week, whatever order the days were ticked in.
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { kind: 'weekly', weekdays: [1, 3, 0], interval: 1 } }),
    );
  });

  it('cannot be sent with no day at all', async () => {
    const user = userEvent.setup();
    renderForm({ initial: { ...EMPTY_HABIT, title: 'Stretch', recurrence: weekly([4]) } });

    await user.click(day('Thursday'));

    expect(submitButton()).toHaveTextContent('Add habit · 0×/week');
    expect(submitButton()).toBeDisabled();
  });

  it('sets the days by preset and shows which preset is the current one', async () => {
    const user = userEvent.setup();
    renderForm({ initial: { ...EMPTY_HABIT, title: 'Stretch' } });
    expect(day('Every day')).toHaveAttribute('aria-pressed', 'true');

    await user.click(day('Weekends'));

    expect(day('Weekends')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Every day')).toHaveAttribute('aria-pressed', 'false');
    expect(day('Saturday')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Sunday')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Monday')).toHaveAttribute('aria-pressed', 'false');

    await user.click(day('Monday')); // no longer exactly "Weekends"
    expect(day('Weekends')).toHaveAttribute('aria-pressed', 'false');
  });

  it('sends the trimmed name, the days in the order of the week and no note when it is blank', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(title(), '  Stretch for 10 minutes  ');
    await user.click(day('Weekdays'));
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Stretch for 10 minutes',
      description: null,
      recurrence: { kind: 'weekly', weekdays: [1, 2, 3, 4, 5], interval: 1 },
      startDate: '2026-10-07',
    });
  });

  it('starts on the given day and sends an earlier one when it is changed', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: { ...EMPTY_HABIT, title: 'Stretch' } });
    expect(startDate()).toHaveValue('2026-10-07');

    fireEvent.change(startDate(), { target: { value: '2026-08-15' } });
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-08-15' }));
  });

  it.each([
    ['', 'Pick a date.'],
    ['1999-12-31', 'Use a date between 2000 and 2100.'],
  ])('does not send the start date "%s" and says why', async (value, message) => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initial: { ...EMPTY_HABIT, title: 'Stretch', startDate: value },
    });

    await user.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(startDate()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('sends a note as typed (trimmed)', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(title(), 'Read');
    await user.type(screen.getByLabelText('Note (optional)'), ' Before bed ');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: 'Before bed' }));
  });

  it('does not send a name that is too long and says why', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: { ...EMPTY_HABIT, title: 'x'.repeat(151) } });

    await user.click(submitButton());

    expect(await screen.findByText('Use at most 150 characters.')).toBeInTheDocument();
    expect(title()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server’s complaint about the days under the days', async () => {
    const user = userEvent.setup();
    renderForm({
      initial: { ...EMPTY_HABIT, title: 'Stretch' },
      onSubmit: () =>
        Promise.reject(
          apiError(400, { fieldErrors: { 'recurrence.weekdays': ['Pick a real day.'] } }),
        ),
    });

    await user.click(submitButton());

    expect(await screen.findByText('Pick a real day.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Repeat on' })).toHaveAccessibleDescription(
      'Pick a real day.',
    );
  });

  it('shows what it cannot pin to a field as a message and keeps what was typed', async () => {
    const user = userEvent.setup();
    renderForm({
      onSubmit: () => Promise.reject(apiError(500, { detail: 'The server is having a bad day.' })),
    });

    await user.type(title(), 'Stretch');
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('The server is having a bad day.');
    expect(title()).toHaveValue('Stretch');
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('can be cancelled', async () => {
    const user = userEvent.setup();
    const { onCancel, onSubmit } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('HabitForm: the repeat rule', () => {
  const named = { ...EMPTY_HABIT, title: 'Stretch' };

  it('offers every kind and starts on "days of the week"', () => {
    renderForm({ initial: named });

    expect(repeat()).toHaveValue('weekly');
    expect(
      within(repeat())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'On days of the week',
      'Every few days',
      'A weekday of the month',
      'A date of the month',
      'A number of times a week',
      'A number of times a month',
    ]);
    expect(screen.getByLabelText('Every how many weeks?')).toHaveValue(1);
    // (the preset button of the same name is not the sentence)
    expect(screen.getByText('Every day', { selector: 'p span' })).toBeInTheDocument();
  });

  it('says the rule in words as it is put together', async () => {
    const user = userEvent.setup();
    renderForm({ initial: named });

    await user.click(day('Weekdays'));
    expect(screen.getByText('Every week on weekdays')).toBeInTheDocument();

    await user.click(day('Friday')); // off: Mon–Thu
    expect(screen.getByText('Every week on Mon, Tue, Wed and Thu')).toBeInTheDocument();

    const weeks = screen.getByLabelText('Every how many weeks?');
    await user.clear(weeks);
    await user.type(weeks, '3');
    // The week of the start date (Wed 7 Oct) starts on Monday 5 Oct.
    expect(
      screen.getByText(
        'Every 3rd week on Mon, Tue, Wed and Thu, starting with the week of Mon 5 Oct 2026',
      ),
    ).toBeInTheDocument();
  });

  it('sends every other week with the weeks counted from the day that was picked', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: { ...named, recurrence: weekly([1, 4]) } });

    const weeks = screen.getByLabelText('Every how many weeks?');
    await user.clear(weeks);
    await user.type(weeks, '2');
    // Until a day is chosen the field shows the start date, and nothing is sent for it.
    expect(screen.getByLabelText('Counted from')).toHaveValue('2026-10-07');
    fireEvent.change(screen.getByLabelText('Counted from'), { target: { value: '2026-10-12' } });
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: { kind: 'weekly', weekdays: [1, 4], interval: 2, anchor: '2026-10-12' },
      }),
    );
  });

  it('sends no day of its own for a rhythm that has none, so the server counts from the start', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: named });

    await user.selectOptions(repeat(), 'everyNDays');
    const days = screen.getByLabelText('Every how many days?');
    await user.clear(days);
    await user.type(days, '3');
    expect(screen.getByText('Every 3rd day, starting Wed 7 Oct 2026')).toBeInTheDocument();
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { kind: 'everyNDays', interval: 3 } }),
    );
  });

  it('keeps the day a rhythm already counts from, whatever the start date becomes', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initial: {
        ...named,
        recurrence: rule({ kind: 'everyNDays', everyDays: 4, anchor: '2026-09-20' }),
      },
    });

    fireEvent.change(startDate(), { target: { value: '2026-08-01' } });
    expect(screen.getByLabelText('Counted from')).toHaveValue('2026-09-20');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: { kind: 'everyNDays', interval: 4, anchor: '2026-09-20' },
        startDate: '2026-08-01',
      }),
    );
  });

  it('follows the start date while the rhythm has no day of its own', async () => {
    const user = userEvent.setup();
    renderForm({ initial: named });
    await user.selectOptions(repeat(), 'everyNDays');

    fireEvent.change(startDate(), { target: { value: '2026-10-01' } });

    expect(screen.getByLabelText('Counted from')).toHaveValue('2026-10-01');
  });

  it('sends the weekday of the month', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: named });

    await user.selectOptions(repeat(), 'monthlyOnWeekday');
    await user.selectOptions(screen.getByLabelText('Which one?'), 'last');
    await user.selectOptions(screen.getByLabelText('Weekday'), 'Saturday');
    expect(screen.getByText('Last Saturday of the month')).toBeInTheDocument();
    // No "×/week": it is not true of this rule.
    expect(submitButton()).toHaveAccessibleName('Add habit');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        recurrence: { kind: 'monthlyOnWeekday', occurrence: 'last', weekday: 6 },
      }),
    );
  });

  it('sends the date of the month, and says what a short month does with a late one', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: named });

    await user.selectOptions(repeat(), 'monthlyOnDate');
    await user.selectOptions(screen.getByLabelText('Day of the month'), '30');
    expect(
      screen.getByText('On the 30th of the month (the last day of a shorter month)'),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Day of the month'), 'Last day');
    expect(screen.getByText('Last day of the month')).toBeInTheDocument();
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { kind: 'monthlyOnDate', dayOfMonth: 31 } }),
    );
  });

  it('sends a number of times a week, on whichever days, and says so on the button', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: named });

    await user.selectOptions(repeat(), 'timesPerWeek');
    const times = screen.getByLabelText('How many times a week?');
    expect(times).toHaveValue(3); // the default of the form
    await user.clear(times);
    await user.type(times, '4');

    expect(screen.getByText(/4 times a week, on whichever days/)).toBeInTheDocument();
    expect(submitButton()).toHaveAccessibleName('Add habit · 4×/week');
    // No day is picked and no rhythm counts from a day: those fields are not on screen.
    expect(screen.queryByLabelText('Counted from')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Monday' })).toBeNull();
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { kind: 'timesPerWeek', times: 4 } }),
    );
  });

  it('sends a number of times a month', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({ initial: named });

    await user.selectOptions(repeat(), 'timesPerMonth');
    const times = screen.getByLabelText('How many times a month?');
    await user.clear(times);
    await user.type(times, '8');

    expect(screen.getByText(/8 times a month, on whichever days/)).toBeInTheDocument();
    expect(submitButton()).toHaveAccessibleName('Add habit · 8×/month');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ recurrence: { kind: 'timesPerMonth', times: 8 } }),
    );
  });

  it('keeps the count while the kind is switched between the week and the month', async () => {
    const user = userEvent.setup();
    renderForm({ initial: { ...named, recurrence: rule({ kind: 'timesPerWeek', times: 5 }) } });

    await user.selectOptions(repeat(), 'timesPerMonth');
    expect(screen.getByLabelText('How many times a month?')).toHaveValue(5);
    await user.selectOptions(repeat(), 'weekly');
    await user.selectOptions(repeat(), 'timesPerWeek');

    expect(screen.getByLabelText('How many times a week?')).toHaveValue(5);
  });

  it('reads the saved count back into the field of an edit', () => {
    renderForm({
      initial: { ...named, recurrence: rule({ kind: 'timesPerMonth', times: 12 }) },
      editing: true,
    });

    expect(repeat()).toHaveValue('timesPerMonth');
    expect(screen.getByLabelText('How many times a month?')).toHaveValue(12);
    // The rule is as it was: no note about the days that have passed.
    expect(screen.queryByText(/also applies to days that have passed/)).toBeNull();
  });

  it('remembers what was set for a kind while another one is chosen', async () => {
    const user = userEvent.setup();
    renderForm({ initial: { ...named, recurrence: weekly([2, 5]) } });

    await user.selectOptions(repeat(), 'monthlyOnDate');
    await user.selectOptions(repeat(), 'weekly');

    expect(day('Tuesday')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Friday')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Monday')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not let a field of another kind stand in the way', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      // "Every how many days" is broken, but the rule is "last Saturday".
      initial: {
        ...named,
        recurrence: rule({
          kind: 'monthlyOnWeekday',
          everyDays: null,
          dayOfMonth: null,
          weekdays: [],
        }),
      },
    });

    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it.each([
    ['weekly', 'Every how many weeks?', { everyWeeks: 0 }, 'Use a whole number from 1 to 52.'],
    ['weekly', 'Every how many weeks?', { everyWeeks: 53 }, 'Use a whole number from 1 to 52.'],
    ['weekly', 'Every how many weeks?', { everyWeeks: 1.5 }, 'Use a whole number from 1 to 52.'],
    ['weekly', 'Every how many weeks?', { everyWeeks: null }, 'Use a whole number from 1 to 52.'],
    ['everyNDays', 'Every how many days?', { everyDays: 1 }, 'Use a whole number from 2 to 365.'],
    ['everyNDays', 'Every how many days?', { everyDays: 366 }, 'Use a whole number from 2 to 365.'],
    ['monthlyOnDate', 'Day of the month', { dayOfMonth: 32 }, 'Use a day from 1 to 31.'],
    ['timesPerWeek', 'How many times a week?', { times: 0 }, 'Use a whole number from 1 to 7.'],
    ['timesPerWeek', 'How many times a week?', { times: 8 }, 'Use a whole number from 1 to 7.'],
    ['timesPerWeek', 'How many times a week?', { times: null }, 'Use a whole number from 1 to 7.'],
    ['timesPerWeek', 'How many times a week?', { times: 2.5 }, 'Use a whole number from 1 to 7.'],
    ['timesPerMonth', 'How many times a month?', { times: 0 }, 'Use a whole number from 1 to 28.'],
    ['timesPerMonth', 'How many times a month?', { times: 29 }, 'Use a whole number from 1 to 28.'],
  ] as const)('does not send %s with %j and says why', async (kind, label, facts, message) => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initial: { ...named, recurrence: rule({ kind, ...facts }) },
    });

    await user.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText(label)).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each([
    ['1999-12-31', 'Use a date between 2000 and 2100.'],
    ['2101-01-01', 'Use a date between 2000 and 2100.'],
    ['not a date', 'Pick a date.'],
  ])('does not send a rhythm counted from "%s"', async (anchor, message) => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      initial: { ...named, recurrence: rule({ kind: 'everyNDays', anchor }) },
    });

    await user.click(submitButton());

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not hold a count of another kind against a rule that has none', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm({
      // 40 is too many for "times a week", but the chosen rule is "last Saturday".
      initial: {
        ...named,
        recurrence: rule({ kind: 'monthlyOnWeekday', times: 40 }),
      },
    });

    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows the server’s complaint about the count under its field', async () => {
    const user = userEvent.setup();
    renderForm({
      initial: { ...named, recurrence: rule({ kind: 'timesPerWeek', times: 3 }) },
      onSubmit: () =>
        Promise.reject(apiError(400, { fieldErrors: { 'recurrence.times': ['Not that often.'] } })),
    });

    await user.click(submitButton());

    expect(await screen.findByText('Not that often.')).toBeInTheDocument();
    expect(screen.getByLabelText('How many times a week?')).toHaveAccessibleDescription(
      /Not that often\./,
    );
  });

  it('shows the server’s one "interval" under the weeks or the days, whichever is chosen', async () => {
    const user = userEvent.setup();
    renderForm({
      initial: { ...named, recurrence: rule({ kind: 'everyNDays', everyDays: 3 }) },
      onSubmit: () =>
        Promise.reject(apiError(400, { fieldErrors: { 'recurrence.interval': ['Too often.'] } })),
    });

    await user.click(submitButton());

    expect(await screen.findByText('Too often.')).toBeInTheDocument();
    expect(screen.getByLabelText('Every how many days?')).toHaveAccessibleDescription(
      /Too often\./,
    );
  });

  describe('when a habit is edited', () => {
    const saved = { ...named, recurrence: weekly([1, 3]) };

    it('says nothing while the rule is as it was', async () => {
      const user = userEvent.setup();
      renderForm({ initial: saved, editing: true });

      await user.type(title(), ' more'); // not the rule
      fireEvent.change(startDate(), { target: { value: '2026-09-01' } });

      expect(screen.queryByText(/also applies to days that have passed/)).toBeNull();
    });

    it('says that a different rule re-judges the days that have passed', async () => {
      const user = userEvent.setup();
      renderForm({ initial: saved, editing: true });

      await user.click(day('Friday'));

      expect(screen.getByText(/also applies to days that have passed/)).toBeInTheDocument();

      await user.click(day('Friday')); // back to what it was
      expect(screen.queryByText(/also applies to days that have passed/)).toBeNull();
    });

    it('does not say it for a new habit, which has no past to judge', async () => {
      const user = userEvent.setup();
      renderForm({ initial: named });

      await user.selectOptions(repeat(), 'everyNDays');

      expect(screen.queryByText(/also applies to days that have passed/)).toBeNull();
    });
  });
});
