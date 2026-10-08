import { Card, PageHeader } from '@/shared/ui';

/** Placeholder: the login / register screen (DESIGN.md §4.1) is built in step F4. */
export function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-xl content-center gap-6 p-6">
      <PageHeader kicker="Hanna's Habits" title="Sign in" />
      <Card>
        <p className="text-neutral-700">The login screen is built in step F4.</p>
      </Card>
    </main>
  );
}
