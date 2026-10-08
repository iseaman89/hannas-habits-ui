import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DIARY_LIMITS, newRowId, type DraftEntry } from './diaryDraft';
import { EntryList } from './EntryList';

const entry = (text: string): DraftEntry => ({ id: newRowId(), text });

function Harness({ initial = [] }: { initial?: DraftEntry[] }) {
  const [items, setItems] = useState(initial);
  return (
    <EntryList
      title="Grateful for"
      addLabel="Add something you are grateful for"
      placeholder="Add something…"
      tone="sage"
      items={items}
      onChange={setItems}
    />
  );
}

const lines = () =>
  screen
    .getAllByRole('textbox')
    .filter((box) => box.getAttribute('aria-label')?.startsWith('Grateful for '))
    .map((box) => (box as HTMLInputElement).value);

const add = () => screen.getByRole('textbox', { name: 'Add something you are grateful for' });

describe('EntryList', () => {
  it('lists the lines and ends with the add row', () => {
    render(<Harness initial={[entry('Sun'), entry('Coffee')]} />);

    expect(screen.getByRole('list', { name: 'Grateful for' })).toBeInTheDocument();
    expect(lines()).toEqual(['Sun', 'Coffee']);
    expect(add()).toHaveAttribute('placeholder', 'Add something…');
  });

  it('adds a line at the end on Enter, trimmed, and empties the add row', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[entry('Sun')]} />);

    await user.type(add(), '  Coffee  {Enter}');

    expect(lines()).toEqual(['Sun', 'Coffee']);
    expect(add()).toHaveValue('');
  });

  it('adds what was typed when the person leaves the add row, so nothing typed is lost', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(add(), 'Rain');
    await user.tab();

    expect(lines()).toEqual(['Rain']);
  });

  it('adds nothing for a blank add row, and Escape drops what was typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(add(), '   {Enter}');
    await user.type(add(), 'draft{Escape}');
    await user.tab();

    expect(lines()).toEqual([]);
  });

  it('edits a line in place', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[entry('Sun'), entry('Cofee')]} />);

    await user.type(screen.getByRole('textbox', { name: 'Grateful for 2' }), 'f');

    expect(lines()).toEqual(['Sun', 'Cofeef']);
  });

  it('removes the line whose button was pressed, not its neighbour', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[entry('Sun'), entry('Coffee'), entry('Rain')]} />);

    await user.click(screen.getByRole('button', { name: 'Remove Grateful for 2' }));

    expect(lines()).toEqual(['Sun', 'Rain']);
  });

  it('removes a line that was emptied when the person leaves it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[entry('Sun'), entry('Coffee')]} />);

    await user.clear(screen.getByRole('textbox', { name: 'Grateful for 1' }));
    expect(lines()).toEqual(['', 'Coffee']);
    await user.tab();

    expect(lines()).toEqual(['Coffee']);
  });

  it('keeps a line’s own text in its own input after another line is removed', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[entry('Sun'), entry('Coffee'), entry('Rain')]} />);
    const coffee = screen.getByRole('textbox', { name: 'Grateful for 2' });

    await user.click(screen.getByRole('button', { name: 'Remove Grateful for 1' }));

    // The same DOM input, not a different row's text poured into it: the key is the id.
    expect(coffee).toBeInTheDocument();
    expect(coffee).toHaveValue('Coffee');
  });

  it('stops the inputs at the server’s length limit', () => {
    render(<Harness initial={[entry('Sun')]} />);

    expect(screen.getByRole('textbox', { name: 'Grateful for 1' })).toHaveAttribute(
      'maxlength',
      String(DIARY_LIMITS.entry),
    );
    expect(add()).toHaveAttribute('maxlength', String(DIARY_LIMITS.entry));
  });

  it('offers no add row once the day holds the most the server accepts', () => {
    const full = Array.from({ length: DIARY_LIMITS.entriesPerList }, (_, i) => entry(`Line ${i}`));
    render(<Harness initial={full} />);

    expect(
      screen.queryByRole('textbox', { name: 'Add something you are grateful for' }),
    ).toBeNull();
    expect(screen.getByText(/the most a day holds/)).toBeInTheDocument();
  });
});
