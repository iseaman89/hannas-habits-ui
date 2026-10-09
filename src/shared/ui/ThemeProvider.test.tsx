import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '@/shared/lib/theme';
import { ThemeProvider } from './ThemeProvider';
import { ThemeSwitch } from './ThemeSwitch';
import { useTheme } from './theme-context';

function Switch({ label }: { label: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <section aria-label={label}>
      <ThemeSwitch value={theme} onChange={setTheme} />
    </section>
  );
}

function renderTwoSwitches() {
  render(
    <ThemeProvider>
      <Switch label="sidebar" />
      <Switch label="login" />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('ThemeProvider', () => {
  it('applies the stored choice to the page', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    renderTwoSwitches();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('switches the page, remembers the choice, and keeps every switch in step', async () => {
    renderTwoSwitches();
    const [sidebarDark] = screen.getAllByRole('radio', { name: 'Dark' });

    await userEvent.click(sidebarDark!);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    // The second switch is a different component: it must show the same state.
    for (const dark of screen.getAllByRole('radio', { name: 'Dark' })) {
      expect(dark).toBeChecked();
    }
  });

  it('does not store a theme the person did not choose', () => {
    renderTwoSwitches();

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});

describe('useTheme', () => {
  it('refuses to work without a provider', () => {
    const quiet = (event: ErrorEvent) => event.preventDefault();
    const originalError = console.error;
    window.addEventListener('error', quiet);
    console.error = () => undefined;
    try {
      expect(() => render(<Switch label="alone" />)).toThrow(
        'useTheme must be used inside a <ThemeProvider>',
      );
    } finally {
      console.error = originalError;
      window.removeEventListener('error', quiet);
    }
  });
});
