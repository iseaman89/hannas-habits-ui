import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Mood } from './diaryDraft';
import { MoodPicker } from './MoodPicker';

function Harness({ initial = null }: { initial?: Mood | null }) {
  const [mood, setMood] = useState<Mood | null>(initial);
  return (
    <>
      <MoodPicker value={mood} onChange={setMood} />
      <p data-testid="mood">{String(mood)}</p>
    </>
  );
}

const mood = () => screen.getByTestId('mood').textContent;

describe('MoodPicker', () => {
  it('is a radio group of five, Great to Rough, with nothing chosen at first', () => {
    render(<Harness />);

    const group = screen.getByRole('radiogroup', { name: 'Mood' });
    const radios = screen.getAllByRole('radio');
    expect(group).toBeInTheDocument();
    expect(radios.map((radio) => radio.getAttribute('value'))).toEqual(['5', '4', '3', '2', '1']);
    expect(radios.every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByRole('radio', { name: 'Great' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Rough' })).toBeInTheDocument();
  });

  it('chooses a mood by the API’s number: Great = 5, Rough = 1', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('radio', { name: 'Great' }));
    expect(mood()).toBe('5');
    expect(screen.getByRole('radio', { name: 'Great' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Rough' }));
    expect(mood()).toBe('1');
    expect(screen.getByRole('radio', { name: 'Great' })).not.toBeChecked();
  });

  it('moves with the arrow keys, as a radio group does', async () => {
    const user = userEvent.setup();
    render(<Harness initial={5} />);

    screen.getByRole('radio', { name: 'Great' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(mood()).toBe('4');
  });

  it('takes the chosen mood back when the chosen face is chosen again, because a day may have no mood', async () => {
    const user = userEvent.setup();
    render(<Harness initial={3} />);

    expect(screen.getByRole('radio', { name: 'Okay' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Okay' }));

    expect(mood()).toBe('null');
    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
  });

  it('clears with the space bar too, on the chosen face', async () => {
    const user = userEvent.setup();
    render(<Harness initial={4} />);

    screen.getByRole('radio', { name: 'Good' }).focus();
    await user.keyboard(' ');

    expect(mood()).toBe('null');
  });

  it('a click on another face changes the mood and does not clear it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={4} />);

    await user.click(screen.getByRole('radio', { name: 'Okay' }));

    expect(mood()).toBe('3');
  });

  it('tells a screen reader how to clear, and has no button for it', () => {
    render(<Harness initial={4} />);

    const group = screen.getByRole('radiogroup', { name: 'Mood' });
    expect(group).toHaveAccessibleDescription('Choose the chosen mood again to clear it.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows only the faces: no title and no word for the chosen one', () => {
    render(<Harness initial={5} />);

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByText('Great', { selector: ':not(.sr-only)' })).not.toBeInTheDocument();
  });

  it('gives a face its name as a tooltip', () => {
    render(<Harness />);

    expect(screen.getByRole('radio', { name: 'Rough' }).closest('label')).toHaveAttribute(
      'title',
      'Rough',
    );
  });
});
