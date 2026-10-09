import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { applyTheme, getInitialTheme, storeTheme, type Theme } from '@/shared/lib/theme';
import { ThemeContext, type ThemeApi } from './theme-context';

/**
 * The one place that knows the current theme (the old `useTheme` hook kept separate state per
 * component, so two switches could disagree). The pure parts live in shared/lib/theme.ts.
 *
 * Only a choice the person makes is stored. The theme taken from the system preference on the
 * first visit is not: otherwise it would turn into a "choice" and the app would stop following
 * the system.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // main.tsx applies the theme before the first paint; this keeps the DOM right in tests and
  // whenever the state changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    storeTheme(next);
  }, []);

  const value = useMemo<ThemeApi>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
