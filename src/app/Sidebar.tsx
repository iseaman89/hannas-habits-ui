import { Link, useMatch } from 'react-router-dom';
import { Calendar, Check, ListChecks, LogOut, Sun, Target, type LucideIcon } from 'lucide-react';
import { useAuth, useUser } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { IconButton, ThemeSwitch, useTheme } from '@/shared/ui';

interface NavEntry {
  to: string;
  /** Route prefix that marks the entry as current, when it differs from `to` (Today -> /diary/…). */
  match?: string;
  label: string;
  Icon: LucideIcon;
}

const NAV: readonly NavEntry[] = [
  // "Today" always goes to the real today (the index route redirects), also from a past diary day.
  { to: '/', match: '/diary', label: 'Today', Icon: Sun },
  { to: '/habits', label: 'Habits', Icon: ListChecks },
  { to: '/calendar', label: 'Calendar', Icon: Calendar },
  { to: '/resolutions', label: 'Resolutions', Icon: Target },
];

function NavItem({ to, match = to, label, Icon }: NavEntry) {
  const current = useMatch({ path: match, end: false }) !== null;

  return (
    <Link
      to={to}
      aria-current={current ? 'page' : undefined}
      className={cn(
        'flex h-11 items-center gap-3 rounded-full px-4 font-semibold transition-colors',
        current ? 'bg-accent text-bg' : 'text-neutral-800 hover:bg-neutral-200',
      )}
    >
      <Icon className="size-5" aria-hidden />
      {label}
    </Link>
  );
}

/** Logo, the four screens, theme switch and the signed-in person (DESIGN.md §3). */
export function Sidebar() {
  const user = useUser();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const initial = (user.displayName.trim()[0] ?? user.email[0] ?? '?').toUpperCase();

  return (
    <aside className="flex w-[15rem] shrink-0 flex-col gap-6 rounded-card bg-surface p-4 shadow-md">
      <Link to="/" className="flex items-center gap-3 rounded-full">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-2 text-bg">
          <Check className="size-6" aria-hidden />
        </span>
        <span className="font-display text-card leading-tight">
          Hanna&apos;s
          <br />
          Habits
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV.map((entry) => (
          <NavItem key={entry.to} {...entry} />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <ThemeSwitch value={theme} onChange={setTheme} />

        <div className="flex items-center gap-3 rounded-md bg-neutral-100 p-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-200 font-display text-accent-800"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{user.displayName}</p>
            <p className="truncate text-xs text-neutral-700">{user.email}</p>
          </div>
          <IconButton label="Log out" size="sm" onClick={() => void signOut()}>
            <LogOut aria-hidden />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
