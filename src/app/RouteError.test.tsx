import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, type RouteObject } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { fakeSession, signedIn } from '@/test/fakeSession';
import { App } from './App';
import { routes } from './routes';

function Broken(): never {
  throw new Error('a mistake in the app');
}

/**
 * Adds one screen to the route that carries the error page - found by its `errorElement`, so
 * the test also fails if that route stops being the parent of the real screens.
 */
function withScreen(table: RouteObject[], screen: RouteObject): RouteObject[] {
  return table.map((route) => {
    if (!route.children) return route;
    const children = route.errorElement
      ? [...route.children, screen]
      : withScreen(route.children, screen);
    return { ...route, children };
  });
}

/** The real route table, with one more screen that crashes while rendering. */
function renderWithBrokenScreen(at: string) {
  // React reports the error it hands to the boundary; that noise is not what is under test.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);

  const table = withScreen(routes, { path: '/broken', element: <Broken /> });
  const router = createMemoryRouter(table, { initialEntries: [at] });
  render(<App session={fakeSession(signedIn)} router={router} />);
  return router;
}

describe('a screen that crashes', () => {
  it('is replaced by an error page inside the shell, so the person can go elsewhere', async () => {
    renderWithBrokenScreen('/broken');

    expect(await screen.findByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('Reloading usually helps');
    // The sidebar is still there ...
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toBeVisible();

    // ... and works: the error does not follow the person to the next screen.
    await userEvent.click(screen.getByRole('link', { name: 'Calendar' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: String(new Date().getFullYear()) }),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
  });
});
