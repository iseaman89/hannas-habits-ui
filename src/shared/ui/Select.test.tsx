import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Select } from './Select';

function Example({ error }: { error?: string }) {
  const [value, setValue] = useState('');
  return (
    <>
      <Field label="Tracked by" error={error}>
        {(control) => (
          <Select value={value} onChange={(event) => setValue(event.target.value)} {...control}>
            <option value="">No habit</option>
            <option value="h-1">Stretch</option>
            <option value="h-2">Read</option>
          </Select>
        )}
      </Field>
      <p data-testid="chosen">{value}</p>
    </>
  );
}

describe('Select', () => {
  it('is a real select, named by its field label', () => {
    render(<Example />);

    const select = screen.getByRole('combobox', { name: 'Tracked by' });
    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'No habit' })).toBeInTheDocument();
  });

  it('reports the choice', async () => {
    render(<Example />);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Tracked by' }), 'Read');

    expect(screen.getByTestId('chosen')).toHaveTextContent('h-2');
  });

  it('is marked invalid, with the message attached, when its field has an error', () => {
    render(<Example error="Pick one of your habits." />);

    const select = screen.getByRole('combobox', { name: 'Tracked by' });
    expect(select).toBeInvalid();
    expect(select).toHaveAccessibleDescription('Pick one of your habits.');
  });

  it('can be disabled', () => {
    render(
      <Select aria-label="Tracked by" disabled>
        <option>None</option>
      </Select>,
    );

    expect(screen.getByRole('combobox', { name: 'Tracked by' })).toBeDisabled();
  });
});
