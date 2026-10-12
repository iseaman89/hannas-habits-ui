import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoteEditor } from './NoteEditor';

// Real timers: Testing Library's async helpers wait on a zero timeout that vitest's fake timers
// would hold back. The pause before a note is written is 0.7 s, so these tests take a moment.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setup(initialText = '') {
  const onSave = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <NoteEditor title="Legs" dayLabel="Mon 5 Oct" initialText={initialText} onSave={onSave} />,
  );
  const field = screen.getByRole('textbox', { name: 'Note for Legs, Mon 5 Oct' });
  return { onSave, user, field, view };
}

describe('NoteEditor', () => {
  it('shows the part, the day and the note that is stored', () => {
    setup('3 x 10');

    expect(screen.getByText('Legs')).toBeInTheDocument();
    expect(screen.getByText('Mon 5 Oct')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('3 x 10');
  });

  it('invites a note on an empty day', () => {
    setup();

    expect(screen.getByPlaceholderText('Add a note…')).toBeInTheDocument();
  });

  it('writes once, a moment after the last keystroke - not once per key', async () => {
    const { onSave, user, field } = setup();

    await user.type(field, '3 x 10');
    expect(onSave).not.toHaveBeenCalled(); // still inside the pause

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith('3 x 10');
  });

  it('starts waiting again with every keystroke', async () => {
    const { onSave, user, field } = setup();

    await user.type(field, 'a');
    await sleep(450);
    await user.type(field, 'b');
    await sleep(450); // 900 ms after the first key, 450 after the last
    expect(onSave).not.toHaveBeenCalled();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith('ab');
  });

  it('writes at once when the field is left, trimmed', async () => {
    const { onSave, user, field } = setup();

    await user.type(field, '  done early \n');
    await user.tab();

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('done early');
    // The timer that was running has nothing left to write.
    await sleep(900);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('writes what is there when the card closes before the pause is over', async () => {
    const { onSave, user, field, view } = setup();
    await user.type(field, 'quick');

    view.unmount();

    expect(onSave).toHaveBeenCalledWith('quick');
  });

  it('takes the note away - writes `null` - when the field is emptied', async () => {
    const { onSave, user, field } = setup('old note');

    await user.clear(field);
    await user.tab();

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('writes nothing for a change that is none: untouched, or back to what it was', async () => {
    const { onSave, user, field, view } = setup('same');

    await user.type(field, 'x');
    await user.type(field, '{Backspace}');
    await user.tab();
    view.unmount();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('writes nothing for blanks typed on an empty day', async () => {
    const { onSave, user, field, view } = setup();

    await user.type(field, '   ');
    await user.tab();
    view.unmount();

    expect(onSave).not.toHaveBeenCalled();
  });

  it('counts the characters near the limit, and stops at it', async () => {
    const { user, field } = setup('a'.repeat(399));
    expect(screen.queryByText(/\/500/)).not.toBeInTheDocument();

    await user.type(field, 'bbbbbbbb');

    expect(field).toHaveAttribute('maxlength', '500');
    expect(screen.getByText('407/500')).toBeInTheDocument();
  });

  it('keeps what is being typed when the stored note changes underneath', async () => {
    const { user, field, view } = setup('stored');
    await user.type(field, ' + mine');

    view.rerender(
      <NoteEditor
        title="Legs"
        dayLabel="Mon 5 Oct"
        initialText="from another device"
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('stored + mine');
  });
});
