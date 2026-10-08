import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DiaryPage } from '@/features/diary';
import { ToastProvider } from '@/shared/ui';
import { diaryDay, fakeDiary } from '@/test/fakeDiary';
import { fakeHabits } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { CalendarPage } from './CalendarPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

/** The app's cache rule (data seen a moment ago is not asked for again), but no retries. */
function newQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } },
  });
}

function renderPage(diary: ReturnType<typeof fakeDiary>, at = '/calendar') {
  const queryClient = newQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/calendar" element={<CalendarPage gateway={diary.gateway} />} />
          <Route path="/diary/:date" element={<p>The diary</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient };
}

const address = () => screen.getByTestId('location').textContent;
const month = (name: string) => screen.getByRole('table', { name });
const face = (link: HTMLElement) => link.firstElementChild;

beforeEach(() => {
  // Only the clock: the timers stay real.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// A year with one day of every kind.
const entries = () =>
  fakeDiary([
    diaryDay('2026-10-01', { mood: 5, highlight: 'A very good day' }),
    diaryDay('2026-10-02', { mood: 4 }),
    diaryDay('2026-10-03', { mood: 3 }),
    diaryDay('2026-10-04', { mood: 2 }),
    diaryDay('2026-10-05', { mood: 1 }),
    diaryDay('2026-10-06', { highlight: 'No mood, just a line' }),
    diaryDay('2026-03-14', { mood: 5 }),
  ]);

describe('the year', () => {
  it('shows the year as the title and the twelve months in order', async () => {
    renderPage(entries());

    await screen.findByRole('table', { name: 'October' });
    expect(screen.getByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual([
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]);
  });

  it('asks for the whole year in one request', async () => {
    const diary = entries();
    renderPage(diary);
    await screen.findByRole('table', { name: 'October' });

    expect(diary.calls.days).toEqual([{ from: '2026-01-01', to: '2026-12-31' }]);
  });

  it('starts each month table with Monday and puts the 1st under its weekday', async () => {
    renderPage(entries());
    const october = await screen.findByRole('table', { name: 'October' });

    expect(
      within(october)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toEqual([
      'MMonday',
      'TTuesday',
      'WWednesday',
      'TThursday',
      'FFriday',
      'SSaturday',
      'SSunday',
    ]);

    // 1 October 2026 is a Thursday: the fourth cell of the first row of days.
    const firstWeek = within(october).getAllByRole('row')[1]!;
    const cells = within(firstWeek).getAllByRole('cell');
    expect(cells.slice(0, 3).map((cell) => cell.textContent)).toEqual(['', '', '']);
    expect(
      within(cells[3]!).getByRole('link', { name: /^Thursday 1 October/ }),
    ).toBeInTheDocument();
  });

  it('has a link for every day up to today and for no day after it', async () => {
    renderPage(fakeDiary());
    await screen.findByRole('table', { name: 'October' });

    // 1 January to 7 October 2026 is 280 days.
    expect(screen.getAllByRole('link')).toHaveLength(280);
  });
});

describe('the days', () => {
  it.each([
    [1, 'Thursday 1 October: mood Great', 'bg-mood-great'],
    [2, 'Friday 2 October: mood Good', 'bg-mood-good'],
    [3, 'Saturday 3 October: mood Okay', 'bg-mood-okay'],
    [4, 'Sunday 4 October: mood Low', 'bg-mood-low'],
    [5, 'Monday 5 October: mood Rough', 'bg-mood-rough'],
  ])('colours October %i by its mood', async (_, name, colour) => {
    renderPage(entries());

    const link = await within(await screen.findByRole('table', { name: 'October' })).findByRole(
      'link',
      { name },
    );

    expect(face(link)).toHaveClass(colour);
    expect(face(link)).toHaveTextContent(String(_));
  });

  it('shows an entry without a mood in a look of its own: neither a mood colour nor "no entry"', async () => {
    renderPage(entries());
    const october = await screen.findByRole('table', { name: 'October' });

    const noMood = within(october).getByRole('link', {
      name: 'Tuesday 6 October: entry without a mood',
    });
    const empty = within(screen.getByRole('table', { name: 'September' })).getByRole('link', {
      name: 'Tuesday 1 September: no entry',
    });

    expect(face(noMood)).toHaveClass('bg-neutral-200', 'border-2', 'border-neutral-500');
    expect(face(noMood)?.className).not.toMatch(/bg-mood-/);
    expect(face(empty)).toHaveClass('border', 'border-neutral-300');
    expect(face(empty)?.className).not.toMatch(/bg-/);
  });

  it('can still be written for a day gone by: it is a link to that day, with a ring', async () => {
    renderPage(entries());

    const link = await within(await screen.findByRole('table', { name: 'January' })).findByRole(
      'link',
      { name: 'Thursday 1 January: no entry' },
    );

    expect(link).toHaveAttribute('href', '/diary/2026-01-01');
  });

  it('marks today with a ring, tells assistive technology which day it is, and only that day', async () => {
    renderPage(entries());
    const october = await screen.findByRole('table', { name: 'October' });

    const today = within(october).getByRole('link', { name: 'Wednesday 7 October: no entry' });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(face(today)).toHaveClass('ring-2', 'ring-accent');

    expect(document.querySelectorAll('[aria-current]')).toHaveLength(1);
    expect(document.querySelectorAll('.ring-accent')).toHaveLength(1);
  });

  it('keeps the ring on today when today has an entry, together with the mood colour', async () => {
    renderPage(fakeDiary([diaryDay('2026-10-07', { mood: 4 })]));

    const today = await screen.findByRole('link', { name: 'Wednesday 7 October: mood Good' });

    expect(face(today)).toHaveClass('bg-mood-good', 'ring-accent');
    expect(today).toHaveAttribute('aria-current', 'date');
  });

  it('shows the days to come as plain numbers, not links - also at the end of this month and in later months', async () => {
    renderPage(entries());
    const october = await screen.findByRole('table', { name: 'October' });

    for (const [table, day] of [
      [october, '8'],
      [october, '31'],
      [month('December'), '25'],
    ] as const) {
      const number = within(table).getByText(day);
      expect(number.closest('a')).toBeNull();
      expect(number).toHaveClass('text-neutral-600');
      expect(number).not.toHaveClass('ring-accent');
    }
    expect(within(month('December')).queryAllByRole('link')).toHaveLength(0);
  });

  it('shows a day to come that has an entry as what it holds, and links it', async () => {
    renderPage(fakeDiary([diaryDay('2026-10-20', { mood: 5 })]));

    const link = await screen.findByRole('link', { name: 'Tuesday 20 October: mood Great' });

    expect(link).toHaveAttribute('href', '/diary/2026-10-20');
    expect(face(link)).toHaveClass('bg-mood-great');
  });

  it('opens the diary of the day that is clicked', async () => {
    const user = userEvent.setup();
    renderPage(entries());

    await user.click(await screen.findByRole('link', { name: 'Thursday 1 October: mood Great' }));

    expect(address()).toBe('/diary/2026-10-01');
    expect(screen.getByText('The diary')).toBeInTheDocument();
  });
});

describe('the months', () => {
  it('count the days that have an entry - those without a mood too', async () => {
    renderPage(entries());
    const october = (await screen.findByRole('heading', { name: 'October' })).parentElement!;
    const march = screen.getByRole('heading', { name: 'March' }).parentElement!;

    expect(within(october).getByText('6 entries')).toBeInTheDocument();
    expect(within(march).getByText('1 entry')).toBeInTheDocument();
  });

  it('say nothing for a month without entries', async () => {
    renderPage(entries());
    const january = (await screen.findByRole('heading', { name: 'January' })).parentElement!;

    expect(january.textContent).toBe('January');
  });

  it('set the month the person is in apart, and only while looking at this year', async () => {
    renderPage(entries());
    const card = async (name: string) =>
      (await screen.findByRole('heading', { name })).closest('.rounded-card')!;

    expect(await card('October')).toHaveClass('bg-neutral-100');
    expect(await card('September')).not.toHaveClass('bg-neutral-100');
    expect(await card('November')).not.toHaveClass('bg-neutral-100');
  });

  it('do not set any month apart in another year', async () => {
    renderPage(entries(), '/calendar?year=2025');
    await screen.findByRole('table', { name: 'October' });

    expect(document.querySelectorAll('.bg-neutral-100')).toHaveLength(0);
  });

  it('count only the days of their own month', async () => {
    // The same day number in another year or month must not be counted.
    renderPage(fakeDiary([diaryDay('2026-11-03', { mood: 2 })]));
    const november = (await screen.findByRole('heading', { name: 'November' })).parentElement!;
    const october = screen.getByRole('heading', { name: 'October' }).parentElement!;

    expect(within(november).getByText('1 entry')).toBeInTheDocument();
    expect(october.textContent).toBe('October');
  });
});

describe('the legend', () => {
  it('names the five moods, great to rough, and the entry without one', async () => {
    renderPage(entries());
    await screen.findByRole('table', { name: 'October' });

    const labels = screen
      .getAllByRole('listitem')
      .map((item) => item.textContent)
      .filter((text) => text !== '');
    expect(labels).toEqual(['Great', 'Good', 'Okay', 'Low', 'Rough', 'No mood']);
  });
});

describe('moving between years', () => {
  it('goes to the year before and back, in the address, and asks for that year', async () => {
    const user = userEvent.setup();
    const diary = entries();
    renderPage(diary);
    await screen.findByRole('table', { name: 'October' });

    await user.click(screen.getByRole('button', { name: 'Previous year' }));

    expect(address()).toBe('/calendar?year=2025');
    expect(await screen.findByRole('heading', { level: 1, name: '2025' })).toBeInTheDocument();
    await waitFor(() =>
      expect(diary.calls.days.at(-1)).toEqual({ from: '2025-01-01', to: '2025-12-31' }),
    );

    await user.click(screen.getByRole('button', { name: 'Next year' }));

    expect(address()).toBe('/calendar');
    expect(await screen.findByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument();
  });

  it('shows what that year holds, and a whole past year can be written: every day is a link and none is "today"', async () => {
    renderPage(
      fakeDiary([diaryDay('2025-12-24', { mood: 5 }), diaryDay('2026-10-01', { mood: 1 })]),
      '/calendar?year=2025',
    );

    expect(
      await screen.findByRole('link', { name: 'Wednesday 24 December: mood Great' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /1 October: mood/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(365);
    expect(document.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('has no next year in the current one - there is no diary for a year that has not begun', async () => {
    renderPage(entries());
    await screen.findByRole('table', { name: 'October' });

    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'This year' })).not.toBeInTheDocument();
  });

  it('offers "This year" away from it and goes back with a clean address', async () => {
    const user = userEvent.setup();
    renderPage(entries(), '/calendar?year=2024');

    await user.click(await screen.findByRole('button', { name: 'This year' }));

    expect(address()).toBe('/calendar');
    expect(await screen.findByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'This year' })).not.toBeInTheDocument();
  });

  it('stops at the first year', async () => {
    renderPage(entries(), '/calendar?year=2000');

    expect(await screen.findByRole('heading', { level: 1, name: '2000' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeEnabled();
  });

  it.each(['abc', '26', '2027', '1999', '2025-01', ''])(
    'shows the current year for the address ?year=%s',
    async (value) => {
      renderPage(entries(), `/calendar?year=${value}`);

      expect(await screen.findByRole('heading', { level: 1, name: '2026' })).toBeInTheDocument();
    },
  );
});

describe('loading, failing and nothing to show', () => {
  it('shows a spinner for the months while the days are on their way, and the legend all along', async () => {
    const diary = entries();
    const release = diary.hold();
    renderPage(diary);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading the calendar');
    expect(screen.getByText('No mood')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    release();

    expect(await screen.findByRole('table', { name: 'October' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says so when the days cannot be loaded, and loads them on a retry', async () => {
    const user = userEvent.setup();
    const diary = entries();
    diary.failNext('days', apiError(500));
    renderPage(diary);

    expect(await screen.findByRole('alert')).toHaveTextContent('The server ran into a problem');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('table', { name: 'October' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the year when a later refresh fails', async () => {
    const diary = entries();
    const { queryClient } = renderPage(diary);
    await screen.findByRole('link', { name: 'Thursday 1 October: mood Great' });

    diary.failNext('days', apiError(500));
    await queryClient.invalidateQueries();

    await waitFor(() => expect(diary.calls.days).toHaveLength(2));
    expect(
      screen.getByRole('link', { name: 'Thursday 1 October: mood Great' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invites the first entry for a year without any - and still shows the months', async () => {
    renderPage(fakeDiary());

    expect(await screen.findByText(/No diary entries in 2026 yet/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'October' })).toBeInTheDocument();
  });

  it('does not say so for a year that has entries', async () => {
    renderPage(entries());
    await screen.findByRole('table', { name: 'October' });

    expect(screen.queryByText(/No diary entries/)).not.toBeInTheDocument();
  });
});

describe('together with the diary', () => {
  function renderApp(diary: ReturnType<typeof fakeDiary>) {
    const habits = fakeHabits();
    render(
      <QueryClientProvider client={newQueryClient()}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/calendar']}>
            <Link to="/calendar">Back to the calendar</Link>
            <Routes>
              <Route path="/calendar" element={<CalendarPage gateway={diary.gateway} />} />
              <Route
                path="/diary/:date"
                element={<DiaryPage gateway={diary.gateway} habitsGateway={habits.gateway} />}
              />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    );
  }

  it('shows a day written a moment ago when the person comes back, although the year was loaded seconds ago', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderApp(diary);

    // The calendar looks at the year: nothing in it.
    await user.click(await screen.findByRole('link', { name: 'Wednesday 7 October: no entry' }));
    await user.type(
      await screen.findByRole('textbox', { name: 'Highlight of the day' }),
      'Wrote this today',
    );
    // Straight back: the write is sent as the diary closes, the calendar is already there.
    await user.click(screen.getByRole('link', { name: 'Back to the calendar' }));

    expect(
      await screen.findByRole('link', { name: 'Wednesday 7 October: entry without a mood' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1 entry')).toBeInTheDocument();
    expect(diary.dayOf('2026-10-07')?.highlight).toBe('Wrote this today');
  });

  it('shows a day that was emptied as empty again', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([diaryDay('2026-10-07', { highlight: 'Only this' })]);
    renderApp(diary);
    await screen.findByRole('link', { name: 'Wednesday 7 October: entry without a mood' });

    await user.click(
      screen.getByRole('link', { name: 'Wednesday 7 October: entry without a mood' }),
    );
    await user.clear(await screen.findByRole('textbox', { name: 'Highlight of the day' }));
    await user.click(screen.getByRole('link', { name: 'Back to the calendar' }));

    expect(
      await screen.findByRole('link', { name: 'Wednesday 7 October: no entry' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/entry$|entries$/)).not.toBeInTheDocument();
  });
});
