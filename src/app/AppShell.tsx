import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/** `/diary/2026-10-08` -> `diary`: the screen, not the day or the month within it. */
function screenOf(pathname: string): string {
  return pathname.split('/')[1] ?? '';
}

/**
 * The frame around every screen behind the login. From `lg` up: the sidebar on the left and the
 * screen scrolling beside it. Below: a bar on top, the screen under it and the navigation fixed
 * to the bottom (see `Sidebar`), hence the room left at the bottom of `main`.
 *
 * `main` is `relative` on purpose: text that is only for screen readers (`sr-only`) is absolutely
 * positioned, and without a positioned ancestor its containing block is the whole page - so
 * `main`'s scrolling neither clips nor moves it. Such an element far to the right (a column of the
 * habit grid) or far down made the page itself wider or taller than the screen: empty space on the
 * right and below, and the fixed bottom bar stretched to the wider page.
 *
 * For keyboard and screen-reader users: a "Skip to content" link as the first stop, and when the
 * person goes to another *screen* (not to another day or month of the same one - their focus is
 * on the button they are paging with) the focus moves to the new screen, which a page load would
 * have done by itself.
 */
export function AppShell() {
  const main = useRef<HTMLElement>(null);
  const screen = screenOf(useLocation().pathname);
  const shownScreen = useRef(screen);

  useEffect(() => {
    if (shownScreen.current === screen) return;
    shownScreen.current = screen;
    main.current?.focus({ preventScroll: true });
  }, [screen]);

  return (
    <div className="flex h-dvh flex-col gap-3 p-3 lg:flex-row">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent-700 focus:px-5 focus:py-2 focus:font-bold focus:text-bg"
        onClick={(event) => {
          // The link would put "#main" into the address and the router would read it as a route.
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <Sidebar />
      <main
        id="main"
        ref={main}
        tabIndex={-1}
        className="relative min-w-0 flex-1 overflow-y-auto px-1 pb-24 pt-2 outline-none sm:px-4 lg:px-10 lg:py-9"
      >
        <Outlet />
      </main>
    </div>
  );
}
