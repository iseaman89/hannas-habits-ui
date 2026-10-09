import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

function renderDialog(props: { open: boolean; onClose?: () => void }) {
  return render(
    <Dialog
      open={props.open}
      onClose={props.onClose ?? (() => undefined)}
      title="New habit"
      actions={<button>Add</button>}
    >
      <p>Body text</p>
    </Dialog>,
  );
}

describe('Dialog', () => {
  it('shows title, content and actions when open, named by its title', () => {
    renderDialog({ open: true });

    const dialog = screen.getByRole('dialog', { name: 'New habit' });
    expect(dialog).toHaveTextContent('Body text');
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('renders no content while closed, so a form inside starts fresh next time', () => {
    renderDialog({ open: false });

    expect(screen.queryByText('Body text')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and closes with the `open` prop', () => {
    const { rerender } = renderDialog({ open: false });

    rerender(
      <Dialog open onClose={() => undefined} title="New habit">
        <p>Body text</p>
      </Dialog>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <Dialog open={false} onClose={() => undefined} title="New habit">
        <p>Body text</p>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('only asks to close on Escape; the parent stays in charge', () => {
    const onClose = vi.fn();
    renderDialog({ open: true, onClose });

    // The browser fires `cancel` on Escape; the component must not let it close by itself.
    const cancel = new Event('cancel', { cancelable: true });
    screen.getByRole('dialog').dispatchEvent(cancel);

    expect(onClose).toHaveBeenCalledOnce();
    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('asks to close on a click on the backdrop (the dialog element itself)', () => {
    const onClose = vi.fn();
    renderDialog({ open: true, onClose });

    fireEvent.click(screen.getByRole('dialog'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not ask to close on a click inside the content', async () => {
    const onClose = vi.fn();
    renderDialog({ open: true, onClose });

    await userEvent.click(screen.getByText('Body text'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
