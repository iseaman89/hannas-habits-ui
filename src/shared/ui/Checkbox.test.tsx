import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './Checkbox';

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox label="Done: Stretch" checked={checked} onChange={setChecked} disabled={disabled} />
  );
}

describe('Checkbox', () => {
  it('is a real checkbox with the given name', () => {
    render(<Harness />);

    expect(screen.getByRole('checkbox', { name: 'Done: Stretch' })).not.toBeChecked();
  });

  it('toggles by click and by the space bar, and reports the new state', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: 'Done: Stretch' });

    await user.click(box);
    expect(box).toBeChecked();

    box.focus();
    await user.keyboard(' ');
    expect(box).not.toBeChecked();
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    render(<Harness disabled />);
    const box = screen.getByRole('checkbox', { name: 'Done: Stretch' });

    await user.click(box);

    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();
  });
});
