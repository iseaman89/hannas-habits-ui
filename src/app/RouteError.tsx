import { Link } from 'react-router-dom';
import { Button, Card, PageHeader } from '@/shared/ui';

/**
 * What a screen shows when it crashes while rendering (a mistake in the app, not a failed
 * request - those have their own messages on their screens). It stands in for the screen only:
 * the sidebar stays, so the person can go elsewhere without a reload.
 */
export function RouteError() {
  return (
    <>
      <PageHeader kicker="Error" title="Something went wrong" />
      <Card role="alert" className="mt-6 flex flex-col items-start gap-4">
        <p className="text-neutral-800">
          This screen stopped working because of a mistake in the app. Reloading usually helps.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => window.location.reload()}>Reload the page</Button>
          <Link to="/" className="font-bold text-accent-700 underline">
            Back to today
          </Link>
        </div>
      </Card>
    </>
  );
}
