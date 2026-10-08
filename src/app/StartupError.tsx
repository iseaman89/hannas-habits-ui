import { Card, PageHeader } from '@/shared/ui';

interface StartupErrorProps {
  title: string;
  /** What is wrong, one sentence each. */
  problems: readonly string[];
  /** What to do about it. */
  hint: string;
}

/**
 * The page for an app that cannot start. It uses nothing but the design system: no router, no
 * session, no API client - those are exactly what may be missing (a missing `VITE_API_URL`
 * would otherwise be a blank page and an error in the console only).
 */
export function StartupError({ title, problems, hint }: StartupErrorProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 p-6">
      <PageHeader kicker="Hanna's Habits" title={title} />
      <Card role="alert" className="flex flex-col gap-4">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
        <p className="text-neutral-700">{hint}</p>
      </Card>
    </main>
  );
}
