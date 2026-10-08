import type { ComponentProps } from 'react';
import { RouterProvider } from 'react-router-dom';
import type { Session } from '@/features/auth';
import { AppProviders } from './AppProviders';

interface AppProps {
  session: Session;
  router: ComponentProps<typeof RouterProvider>['router'];
}

/** The session and the router come in from outside, so a test can run the whole app on fakes. */
export function App({ session, router }: AppProps) {
  return (
    <AppProviders session={session}>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
