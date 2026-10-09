import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from './Slider';

describe('Slider', () => {
  it('is a range input with an accessible name and the given value', () => {
    render(<Slider label="Body energy" value={40} onChange={() => undefined} />);

    const slider = screen.getByRole('slider', { name: 'Body energy' });
    expect(slider).toHaveValue('40');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
  });

  it('reports the new value as a number', () => {
    const onChange = vi.fn();
    render(<Slider label="Mind" value={10} onChange={onChange} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '65' } });

    expect(onChange).toHaveBeenCalledWith(65);
  });

  it('fills the track up to the value', () => {
    render(<Slider label="Mind" value={25} min={0} max={50} onChange={() => undefined} />);

    expect(screen.getByRole('slider').style.getPropertyValue('--slider-pct')).toBe('50%');
  });

  it('keeps the fill inside 0-100 % for out-of-range values', () => {
    const { rerender } = render(<Slider label="Mind" value={150} onChange={() => undefined} />);
    expect(screen.getByRole('slider').style.getPropertyValue('--slider-pct')).toBe('100%');

    rerender(<Slider label="Mind" value={-5} onChange={() => undefined} />);
    expect(screen.getByRole('slider').style.getPropertyValue('--slider-pct')).toBe('0%');
  });
});
