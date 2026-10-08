import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { LucideProvider } from 'lucide-react';
import '@fontsource/caprasimo/400.css';
import '@fontsource-variable/figtree/wght.css';
import { App } from '@/app/App';
import { routes } from '@/app/routes';
import { session } from '@/features/auth/appSession';
import { applyTheme, getInitialTheme } from '@/shared/lib/theme';
import './index.css';

// Before the first render, so the page never paints in the wrong theme.
applyTheme(getInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

const router = createBrowserRouter(routes);

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* The design draws every icon with a 2.75 stroke (Lucide's default is 2). */}
    <LucideProvider strokeWidth={2.75}>
      <App session={session} router={router} />
    </LucideProvider>
  </React.StrictMode>,
);
