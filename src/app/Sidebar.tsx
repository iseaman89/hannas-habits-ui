import { Link, useMatch } from 'react-router-dom';
import { Calendar, ListChecks, LogOut, Sun, Target, type LucideIcon } from 'lucide-react';
import { useAuth, useUser } from '@/features/auth';
import { cn } from '@/shared/lib/cn';
import { possessive } from '@/shared/lib/possessive';
import { BrandMark, IconButton, ThemeSwitch, useTheme } from '@/shared/ui';

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
        // Small screens: a tab in the bottom bar (icon over label); `lg` and up: a pill in the
        // sidebar. The design only has the sidebar, so the small-screen tab marks the current
        // screen with the tinted pair that passes contrast (accent on bg is 3.0 : 1, DESIGN.md §8).
        'flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-semibold transition-colors sm:h-14',
        'lg:h-11 lg:flex-row lg:justify-start lg:gap-3 lg:px-4 lg:text-base',
        current
          ? 'bg-accent-200 text-accent-800 lg:bg-accent lg:text-bg'
          : 'text-neutral-800 hover:bg-neutral-200',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/**
 * Logo, the four screens, theme switch and the signed-in person (DESIGN.md §3).
 *
 * One element, two layouts, so there is one tab order and one "Main" landmark: from `lg` up it
 * is the floating sidebar of the design; below that it is a slim bar on top (logo, the service's
 * name, theme switch, log out) and the navigation is a bar fixed to the bottom of the screen,
 * where a thumb reaches. Both bars are lower on a phone (below `sm`) than on a tablet.
 */
export function Sidebar() {
  const user = useUser();
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const initial = (user.firstName.trim()[0] ?? user.email[0] ?? '?').toUpperCase();

  return (
    <aside className="flex items-center gap-2 rounded-card bg-surface p-2 shadow-md sm:gap-3 sm:p-3 lg:w-[15rem] lg:shrink-0 lg:flex-col lg:items-stretch lg:gap-6 lg:p-4">
      <Link to="/" className="flex min-w-0 items-center gap-2 rounded-full sm:gap-3">
        <BrandMark firstName={user.firstName} className="size-8 text-base sm:size-11 sm:text-xl" />
        {/* The service carries the person's name, and its first letter is the logo. */}
        <span className="min-w-0 truncate font-display text-base leading-tight lg:text-card">
          {possessive(user.firstName)} <br className="hidden lg:inline" />
          Habits
        </span>
      </Link>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-4 gap-1 rounded-card bg-surface p-1.5 shadow-lg sm:p-2 lg:static lg:z-auto lg:flex lg:flex-col lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none"
      >
        {NAV.map((entry) => (
          <NavItem key={entry.to} {...entry} />
        ))}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-4">
        <ThemeSwitch value={theme} onChange={setTheme} />

        <div className="flex items-center gap-3 lg:rounded-md lg:bg-neutral-100 lg:p-3">
          <span
            aria-hidden
            className="hidden size-10 shrink-0 place-items-center rounded-full bg-accent-200 font-display text-accent-800 lg:grid"
          >
            {initial}
          </span>
          <div className="hidden min-w-0 flex-1 lg:block">
            <p className="truncate font-bold">{user.firstName}</p>
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
