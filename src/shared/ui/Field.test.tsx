import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Input } from './Input';

function renderField(props: { hint?: string; error?: string } = {}) {
  render(
    <Field label="Email" {...props}>
      {(control) => <Input {...control} />}
    </Field>,
  );
  return screen.getByRole('textbox', { name: 'Email' });
}

describe('Field', () => {
  it('connects the label to the control', () => {
    const input = renderField();

    expect(input).toBeInTheDocument();
    expect(input).toBeValid();
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('marks the control invalid and describes it by the error', () => {
    const input = renderField({ error: 'Enter a valid email' });

    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription('Enter a valid email');
  });

  it('describes the control by the hint', () => {
    const input = renderField({ hint: 'We never share it' });

    expect(input).toHaveAccessibleDescription('We never share it');
    expect(input).toBeValid();
  });

  it('reads the error before the hint', () => {
    const input = renderField({ error: 'Required', hint: 'We never share it' });

    expect(input).toHaveAccessibleDescription('Required We never share it');
  });

  it('gives every field its own ids', () => {
    render(
      <>
        <Field label="First">{(control) => <Input {...control} />}</Field>
        <Field label="Second">{(control) => <Input {...control} />}</Field>
      </>,
    );

    expect(screen.getByLabelText('First').id).not.toBe(screen.getByLabelText('Second').id);
  });
});
