import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, type Session } from '@/features/auth';
import { useBrandIcon } from '@/shared/lib/useBrandIcon';
import { ThemeProvider, ToastProvider } from '@/shared/ui';
import { createQueryClient } from './queryClient';

/**
 * Everything the screens can ask for, in the order they depend on each other: the theme and
 * the server-data cache stand alone, the toasts need nothing, the session needs the cache (to
 * clear it) and the toasts (to say "session expired"). The router goes inside, so every route
 * can use all of them.
 */
export function AppProviders({ session, children }: { session: Session; children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useBrandIcon();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider session={session}>{children}</AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
