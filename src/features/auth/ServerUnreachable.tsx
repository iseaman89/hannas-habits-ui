import { useState } from 'react';
import { Button, Card, PageHeader } from '@/shared/ui';
import { useAuth } from './auth-context';

/**
 * Shown instead of the app (and instead of the login form) when a session is stored but the
 * server could not be asked about it. The person is very likely still signed in; a login form
 * would suggest they are not, and could not work without the server anyway.
 */
export function ServerUnreachable() {
  const { reconnect } = useAuth();
  const [trying, setTrying] = useState(false);

  async function tryAgain() {
    setTrying(true);
    try {
      await reconnect();
    } finally {
      setTrying(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
      <PageHeader kicker="Connection" title="We can't reach the server" />
      <Card role="alert" className="flex flex-col items-start gap-4">
        <p className="text-neutral-800">
          You are still signed in - nothing has been lost. Check your connection and try again; it
          also tries by itself as soon as the browser is back online.
        </p>
        <Button onClick={() => void tryAgain()} loading={trying}>
          Try again
        </Button>
      </Card>
    </main>
  );
}
