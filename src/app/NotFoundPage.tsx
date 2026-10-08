import { Link } from 'react-router-dom';
import { Card, PageHeader } from '@/shared/ui';

export function NotFoundPage() {
  return (
    <>
      <PageHeader kicker="404" title="Page not found" />
      <Card className="mt-6">
        <p className="text-neutral-700">
          There is nothing at this address.{' '}
          <Link to="/" className="font-bold text-accent-700 underline">
            Back to today
          </Link>
        </p>
      </Card>
    </>
  );
}
