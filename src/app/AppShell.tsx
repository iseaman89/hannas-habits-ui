import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/** The frame around every screen behind the login: sidebar on the left, the screen scrolls. */
export function AppShell() {
  return (
    <div className="flex h-dvh gap-3 p-3">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-10 py-9">
        <Outlet />
      </main>
    </div>
  );
}
