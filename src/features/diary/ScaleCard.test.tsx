import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScaleCard } from './ScaleCard';

function Harness({ initial = null }: { initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <>
      <ScaleCard
        title="Body"
        low="Drained"
        high="Energised"
        tone="accent-2"
        value={value}
        onChange={setValue}
      />
      <p data-testid="value">{String(value)}</p>
    </>
  );
}

const slider = () => screen.getByRole('slider', { name: 'Body: Drained to Energised' });

describe('ScaleCard', () => {
  it('is "not set" until the person moves it - a dash, not a number nobody chose', () => {
    render(<Harness />);

    expect(screen.getByRole('heading', { name: 'Body' })).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(slider()).toHaveAttribute('aria-valuetext', 'not set');
    expect(screen.queryByRole('button', { name: 'Clear body' })).not.toBeInTheDocument();
  });

  it('shows the chosen percentage and reports it as a number', () => {
    render(<Harness />);

    fireEvent.change(slider(), { target: { value: '70' } });

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('70');
    expect(slider()).toHaveAttribute('aria-valuetext', '70 percent');
  });

  it('can be 0 - that is a value, not "not set"', () => {
    render(<Harness initial={0} />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear body' })).toBeInTheDocument();
  });

  it('can be cleared again', async () => {
    const user = userEvent.setup();
    render(<Harness initial={40} />);

    await user.click(screen.getByRole('button', { name: 'Clear body' }));

    expect(screen.getByTestId('value')).toHaveTextContent('null');
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('labels both ends of the scale', () => {
    render(<Harness />);

    expect(screen.getByText('Drained')).toBeInTheDocument();
    expect(screen.getByText('Energised')).toBeInTheDocument();
  });
});
