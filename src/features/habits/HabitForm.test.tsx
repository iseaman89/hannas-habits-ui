import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { apiError } from '@/test/problems';
import { EMPTY_HABIT, type HabitValues } from './habitSchema';
import type { HabitInput } from './habitsGateway';
import { HabitForm } from './HabitForm';

function renderForm(
  options: { initial?: HabitValues; onSubmit?: (input: HabitInput) => Promise<unknown> } = {},
) {
  const onSubmit = options.onSubmit ?? vi.fn(() => Promise.resolve());
  const onCancel = vi.fn();
  render(
    <HabitForm
      initial={options.initial ?? EMPTY_HABIT}
      submitLabel="Add habit"
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
}

const title = () => screen.getByLabelText('What do you want to do?');
const day = (name: string) => screen.getByRole('button', { name });
const submitButton = () => screen.getByRole('button', { name: /^Add habit/ });

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
      initial: { ...EMPTY_HABIT, title: 'Stretch', schedule: [1] },
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
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ schedule: [1, 3, 0] }));
  });

  it('cannot be sent with no day at all', async () => {
    const user = userEvent.setup();
    renderForm({ initial: { ...EMPTY_HABIT, title: 'Stretch', schedule: [4] } });

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
      schedule: [1, 2, 3, 4, 5],
    });
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
        Promise.reject(apiError(400, { fieldErrors: { schedule: ['Pick a real day.'] } })),
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
