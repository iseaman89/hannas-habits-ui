import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DayCell } from './DayCell';

/** The decorative parts of a cell: its face, and the dot of a note. Neither is read out. */
const decorations = (element: HTMLElement) => element.querySelectorAll('[aria-hidden]').length;

describe('DayCell and a note', () => {
  it('has no dot, and its plain name, without a note', () => {
    render(<DayCell state="open" label="Sport: Legs, Mon 5 Oct" onToggle={() => undefined} />);

    const cell = screen.getByRole('button', { name: 'Sport: Legs, Mon 5 Oct' });
    expect(decorations(cell)).toBe(1); // the face only
  });

  it('shows a dot and says the note after its name, on a cell that can be ticked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <DayCell state="open" label="Sport: Legs, Mon 5 Oct" note="3 x 10" onToggle={onToggle} />,
    );

    const cell = screen.getByRole('button', { name: 'Sport: Legs, Mon 5 Oct. Note: 3 x 10' });
    expect(decorations(cell)).toBe(2); // the face and the dot

    await user.click(cell);
    expect(onToggle).toHaveBeenCalledTimes(1); // the dot does not take the click away
  });

  it('shows the dot on a cell that cannot be ticked as well, and says the note too', () => {
    render(
      <DayCell
        state="not-scheduled"
        label="Sport: Legs, Wed 7 Oct"
        note="went anyway"
        onToggle={() => undefined}
      />,
    );

    const cell = screen.getByRole('img', {
      name: 'Sport: Legs, Wed 7 Oct: not scheduled. Note: went anyway',
    });
    expect(decorations(cell)).toBe(2);
  });
});
