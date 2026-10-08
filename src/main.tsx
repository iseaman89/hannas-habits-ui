import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LucideProvider } from 'lucide-react';
import Modal from 'react-modal';
import '@fontsource/caprasimo/400.css';
import '@fontsource-variable/figtree/wght.css';
import App from './App';
import './index.css';
import { applyTheme, getInitialTheme } from '@/shared/lib/theme';

Modal.setAppElement('#root');

// Before the first render, so the page never paints in the wrong theme.
applyTheme(getInitialTheme());

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {/* The design draws every icon with a 2.75 stroke (Lucide's default is 2). */}
    <LucideProvider strokeWidth={2.75}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LucideProvider>
  </React.StrictMode>,
);
