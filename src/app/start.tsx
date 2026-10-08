import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { LucideProvider } from 'lucide-react';
import { session } from '@/features/auth/appSession';
import { App } from './App';
import { routes } from './routes';

/**
 * Starts the real app. Kept apart from `main.tsx` and loaded from there only after the
 * configuration has been checked: importing this file pulls in the API client, which needs
 * `VITE_API_URL`.
 */
export function start(rootElement: HTMLElement): void {
  const router = createBrowserRouter(routes);

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      {/* The design draws every icon with a 2.75 stroke (Lucide's default is 2). */}
      <LucideProvider strokeWidth={2.75}>
        <App session={session} router={router} />
      </LucideProvider>
    </React.StrictMode>,
  );
}
