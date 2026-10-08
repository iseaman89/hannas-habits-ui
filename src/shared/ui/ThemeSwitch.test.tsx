import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeSwitch } from './ThemeSwitch';

describe('ThemeSwitch', () => {
  it('is a radio group with the current theme selected', () => {
    render(<ThemeSwitch value="dark" onChange={() => undefined} />);

    expect(screen.getByRole('radiogroup', { name: 'Colour theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Light' })).not.toBeChecked();
  });

  it('reports the theme that was clicked', async () => {
    const onChange = vi.fn();
    render(<ThemeSwitch value="light" onChange={onChange} />);

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith('dark');
  });

  it('can be driven with the keyboard', async () => {
    const onChange = vi.fn();
    render(<ThemeSwitch value="light" onChange={onChange} />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');

    expect(onChange).toHaveBeenCalledWith('dark');
  });
});
