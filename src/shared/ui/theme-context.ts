import { createContext, useContext } from 'react';
import type { Theme } from '@/shared/lib/theme';

export interface ThemeApi {
  theme: Theme;
  /** The person's choice: applied at once and remembered for the next visit. */
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeApi | null>(null);

/** `const { theme, setTheme } = useTheme()` — needs a ThemeProvider above. */
export function useTheme(): ThemeApi {
  const api = useContext(ThemeContext);
  if (!api) throw new Error('useTheme must be used inside a <ThemeProvider>');
  return api;
}
