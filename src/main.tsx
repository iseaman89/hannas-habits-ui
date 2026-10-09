import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/caprasimo/400.css';
import '@fontsource-variable/figtree/wght.css';
import { StartupError } from '@/app/StartupError';
import { apiUrlProblem } from '@/shared/api/apiUrl';
import { applyTheme, getInitialTheme } from '@/shared/lib/theme';
import './index.css';

// Before the first render, so the page never paints in the wrong theme.
applyTheme(getInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}
const root = rootElement;

function showStartupError(title: string, problems: string[], hint: string) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <StartupError title={title} problems={problems} hint={hint} />
    </React.StrictMode>,
  );
}

const configProblem = apiUrlProblem(import.meta.env.VITE_API_URL);
if (configProblem) {
  showStartupError(
    'The app is not set up',
    [configProblem],
    'In development copy .env.example to .env and restart npm run dev. In Docker pass the value as a build argument (--build-arg) and build the image again: VITE_ values are fixed into the page when it is built, not read when it starts.',
  );
} else {
  // The app is loaded on demand: its API client refuses to exist without a valid address.
  import('@/app/start')
    .then(({ start }) => {
      start(root);
    })
    .catch(() => {
      showStartupError(
        'The app could not be loaded',
        ['Part of the app did not arrive.'],
        'Check your connection and reload the page. If it keeps happening, the app may just have been updated: a reload fetches the new version.',
      );
    });
}
