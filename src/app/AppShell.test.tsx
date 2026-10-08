import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, Link } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { fakeSession, signedIn } from '@/test/fakeSession';
import { App } from './App';
import { AppShell } from './AppShell';

// Two screens with a way to page within one of them, like the diary's previous/next day.
function renderShell(at: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppShell />,
        children: [
          {
            path: '/diary/:date',
            element: (
              <>
                <h1>Diary</h1>
                <Link to="/diary/2026-10-07">Previous day</Link>
              </>
            ),
          },
          { path: '/habits', element: <h1>Habits</h1> },
          { path: '/habits/archive', element: <h1>Archive</h1> },
        ],
      },
    ],
    { initialEntries: [at] },
  );
  render(<App session={fakeSession(signedIn)} router={router} />);
  return router;
}

describe('AppShell', () => {
  it('starts with a skip link that moves the focus into the screen without touching the address', async () => {
    const router = renderShell('/habits');

    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();
    // The page's own address (a memory router has none of its own): no "#main" in it.
    expect(window.location.hash).toBe('');
    expect(router.state.location.pathname).toBe('/habits');
  });

  it('leaves the focus alone when a screen first appears', () => {
    renderShell('/habits');

    expect(document.body).toHaveFocus();
  });

  it('moves the focus to the new screen when the person goes to another one', async () => {
    renderShell('/diary/2026-10-08');

    await userEvent.click(screen.getByRole('link', { name: 'Habits' }));

    expect(screen.getByRole('heading', { name: 'Habits' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('keeps the focus on the control the person is paging with within one screen', async () => {
    renderShell('/diary/2026-10-08');

    const previous = screen.getByRole('link', { name: 'Previous day' });
    await userEvent.click(previous);

    expect(previous).toHaveFocus();
  });
});
