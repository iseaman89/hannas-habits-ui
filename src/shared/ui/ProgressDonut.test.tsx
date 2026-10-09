import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressDonut } from './ProgressDonut';

describe('ProgressDonut', () => {
  it('names itself by the rounded percentage', () => {
    render(<ProgressDonut value={76.6} />);

    expect(screen.getByRole('img', { name: '77%' })).toBeInTheDocument();
  });

  it('prefers the given label', () => {
    render(<ProgressDonut value={77} label="77% of 2026 is behind you" />);

    expect(screen.getByRole('img', { name: '77% of 2026 is behind you' })).toBeInTheDocument();
  });

  it.each([
    [150, '100%'],
    [-20, '0%'],
    [Number.NaN, '0%'],
  ])('clamps %s to %s', (value, expected) => {
    render(<ProgressDonut value={value} />);

    expect(screen.getByRole('img', { name: expected })).toBeInTheDocument();
  });

  it('shows the arc in proportion to the value', () => {
    const { container } = render(<ProgressDonut value={25} size={116} />);
    const arc = container.querySelectorAll('circle')[1];
    const circumference = 2 * Math.PI * ((116 - 16) / 2);

    expect(Number(arc?.getAttribute('stroke-dashoffset'))).toBeCloseTo(circumference * 0.75);
  });
});
