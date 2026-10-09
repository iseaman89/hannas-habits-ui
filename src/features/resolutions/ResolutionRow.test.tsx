import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { Resolution } from './resolutionsGateway';
import { ResolutionRow } from './ResolutionRow';

const open: Resolution = {
  id: 'r-1',
  title: 'Read twelve books',
  kept: false,
  habitId: null,
  habitTitle: null,
};

function renderRow(item: Resolution, number = 3) {
  const handlers = { onToggleKept: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
  render(
    <MemoryRouter>
      <ol>
        <ResolutionRow item={item} number={number} {...handlers} />
      </ol>
    </MemoryRouter>,
  );
  return handlers;
}

describe('ResolutionRow', () => {
  it('shows the number and the title', () => {
    renderRow(open, 7);

    expect(screen.getByRole('listitem')).toHaveTextContent(/^7Read twelve books/);
  });

  it('offers “Mark kept” for an open item and reports it', async () => {
    const handlers = renderRow(open);

    await userEvent.click(screen.getByRole('button', { name: 'Mark kept: Read twelve books' }));

    expect(handlers.onToggleKept).toHaveBeenCalledWith(open, true);
    expect(screen.queryByText('Kept')).not.toBeInTheDocument();
  });

  it('shows “Kept” for a kept item, and that button takes it back', async () => {
    const item = { ...open, kept: true };
    const handlers = renderRow(item);

    await userEvent.click(
      screen.getByRole('button', { name: 'Kept: Read twelve books - mark as not kept' }),
    );

    expect(handlers.onToggleKept).toHaveBeenCalledWith(item, false);
    expect(screen.queryByRole('button', { name: /^Mark kept/ })).not.toBeInTheDocument();
  });

  it('names its edit and delete buttons after the item and reports them', async () => {
    const handlers = renderRow(open);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Read twelve books' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete Read twelve books' }));

    expect(handlers.onEdit).toHaveBeenCalledWith(open);
    expect(handlers.onDelete).toHaveBeenCalledWith(open);
  });

  it('links to the habit it is tracked by', () => {
    renderRow({ ...open, habitId: 'h-1', habitTitle: 'Read' });

    expect(screen.getByRole('link', { name: 'Tracked by “Read”' })).toHaveAttribute(
      'href',
      '/habits',
    );
  });

  it('has no link without a habit - and none that says “Tracked by “”” when only the title is missing', () => {
    renderRow(open);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no link when the link is set but the habit’s title did not come with it', () => {
    renderRow({ ...open, habitId: 'h-1', habitTitle: null });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
