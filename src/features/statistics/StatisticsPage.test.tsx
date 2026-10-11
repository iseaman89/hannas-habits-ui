import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeHabits, type FakeHabit } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { recurrenceOf } from '@/test/recurrence';
import { StatisticsPage } from './StatisticsPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

const stretch: FakeHabit = {
  id: 'h-stretch',
  title: 'Stretch',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-10-01',
  completed: ['2026-10-05', '2026-10-06'],
};

const read: FakeHabit = {
  id: 'h-read',
  title: 'Read',
  weekdays: [1, 3, 5], // Mon, Wed, Fri
  startDate: '2026-09-01',
  completed: [],
};

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function renderPage(
  fake: ReturnType<typeof fakeHabits>,
  at = '/statistics',
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[at]}>
        <Routes>
          <Route path="/statistics" element={<StatisticsPage gateway={fake.gateway} />} />
          <Route path="/habits" element={<p>The habits</p>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
}

const cardOf = (title: string) =>
  screen.getByRole('heading', { level: 2, name: title }).closest('li') as HTMLElement;

beforeEach(() => {
  // Only the clock: the timers stay real, so Testing Library's waiting keeps working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the month', () => {
  it('asks for the current month with the client’s today and names it', async () => {
    const fake = fakeHabits([stretch]);
    renderPage(fake);

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    expect(fake.calls.statistics).toEqual([
      { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' },
    ]);
  });

  it('opens the month in the address, and nonsense falls back to the current month', async () => {
    const fake = fakeHabits([stretch]);
    renderPage(fake, '/statistics?month=2026-09');

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });
    expect(fake.calls.statistics[0]).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      asOf: '2026-10-07',
    });
  });

  it('falls back to the current month for an address that is not a month', async () => {
    renderPage(fakeHabits([stretch]), '/statistics?month=soon');

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });

  it('pages through the months in the address, and "This month" comes back clean', async () => {
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });
    expect(screen.queryByRole('button', { name: 'This month' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/statistics?month=2026-09');
    expect(fake.calls.statistics.at(-1)).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      asOf: '2026-10-07',
    });

    await userEvent.click(screen.getByRole('button', { name: 'This month' }));

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/statistics$/);
  });
});

describe('a habit', () => {
  it('shows the share, the count, the rule and when it was last done', async () => {
    renderPage(fakeHabits([stretch, read]));
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    // Every day since 1 October, as of Wednesday 7th (open): 1..6 judged, two of them done.
    const stretchCard = within(cardOf('Stretch'));
    expect(stretchCard.getByText('33 %')).toBeInTheDocument();
    expect(stretchCard.getByText('Done on 2 of 6 days')).toBeInTheDocument();
    expect(stretchCard.getByText('Every day')).toBeInTheDocument();
    expect(stretchCard.getByText('Last done yesterday')).toBeInTheDocument();

    // Mondays, Wednesdays, Fridays: Fri 2 and Mon 5 are judged, none done.
    const readCard = within(cardOf('Read'));
    expect(readCard.getByText('0 %')).toBeInTheDocument();
    expect(readCard.getByText('Done on 0 of 2 days')).toBeInTheDocument();
    expect(readCard.getByText('Mon · Wed · Fri')).toBeInTheDocument();
    expect(readCard.getByText('Not done yet')).toBeInTheDocument();
  });

  it('keeps the habits in the order the server sends them', async () => {
    renderPage(fakeHabits([read, stretch]));
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Read', 'Stretch']);
  });

  it('shows a dash, not 0 %, while nothing is judged', async () => {
    // Starts tomorrow: nothing is due yet.
    renderPage(fakeHabits([{ ...read, startDate: '2026-10-08' }]));
    await screen.findByRole('heading', { level: 2, name: 'Read' });

    const card = within(cardOf('Read'));
    expect(card.getByText('–')).toBeInTheDocument();
    expect(card.getByText('Nothing to judge yet')).toBeInTheDocument();
    expect(card.queryByText('0 %')).not.toBeInTheDocument();
  });

  it('counts a quota in weeks and explains how a week is counted', async () => {
    const run: FakeHabit = {
      id: 'h-run',
      title: 'Run',
      recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 2 }, '2026-09-01'),
      startDate: '2026-09-01',
      // 28 Sep-4 Oct: two (met); the running week 5-11 has one, so it is not judged yet.
      completed: ['2026-10-01', '2026-10-02', '2026-10-05'],
    };
    renderPage(fakeHabits([run]));
    await screen.findByRole('heading', { level: 2, name: 'Run' });

    const card = within(cardOf('Run'));
    expect(card.getByText('100 %')).toBeInTheDocument();
    expect(card.getByText('Reached the goal in 1 of 1 week')).toBeInTheDocument();
    expect(card.getByText('Twice a week')).toBeInTheDocument();
    expect(screen.getByText(/A week counts for the month it ends in/)).toBeInTheDocument();
  });

  it('does not talk about weeks when no habit is a quota', async () => {
    renderPage(fakeHabits([stretch]));
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    expect(screen.getByText(/Only days that are over are counted/)).toBeInTheDocument();
    expect(screen.queryByText(/A week counts/)).not.toBeInTheDocument();
  });
});

describe('the parts of a habit', () => {
  const sport: FakeHabit = {
    id: 'h-sport',
    title: 'Sport',
    weekdays: [1, 3, 5],
    startDate: '2026-09-01',
    completed: ['2026-10-05'],
    subHabits: [
      { id: 'p-legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
      { id: 'p-arms', title: 'Arms', weekdays: [3] },
    ],
  };

  it('lists each part with its weekdays, share, count and last day', async () => {
    renderPage(fakeHabits([sport]));
    await screen.findByRole('heading', { level: 2, name: 'Sport' });

    const parts = within(cardOf('Sport')).getAllByRole('listitem');
    // Legs: Monday 5 October was due and done. Arms: Wednesday 7th is today and still open.
    expect(parts).toHaveLength(2);
    expect(parts[0]).toHaveTextContent('Legs');
    expect(parts[0]).toHaveTextContent('Mon');
    expect(parts[0]).toHaveTextContent('100 %');
    expect(parts[0]).toHaveTextContent('Done on 1 of 1 day · last done Mon 5 Oct · 2 days ago');
    expect(parts[1]).toHaveTextContent('Arms');
    expect(parts[1]).toHaveTextContent('Nothing to judge yet · never done');
  });

  it('counts the parts of a quota habit in days, whatever the habit itself is counted in', async () => {
    const run: FakeHabit = {
      id: 'h-run',
      title: 'Run',
      recurrence: recurrenceOf({ kind: 'timesPerWeek', times: 3 }, '2026-09-01'),
      startDate: '2026-09-01',
      completed: [],
      subHabits: [{ id: 'p-long', title: 'Long run', weekdays: [1], completed: ['2026-10-05'] }],
    };
    renderPage(fakeHabits([run]));
    await screen.findByRole('heading', { level: 2, name: 'Run' });

    const card = within(cardOf('Run'));
    expect(card.getByText(/^Reached the goal in 0 of 1 week$/)).toBeInTheDocument();
    expect(card.getByText(/^Done on 1 of 1 day · /)).toBeInTheDocument();
  });

  it('has no parts section for a habit without parts', async () => {
    renderPage(fakeHabits([stretch]));
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    expect(within(cardOf('Stretch')).queryByRole('heading', { name: 'Parts' })).toBeNull();
  });
});

describe('loading, failing, nothing to show', () => {
  it('shows placeholders while the server answers', async () => {
    const fake = fakeHabits([stretch]);
    const release = fake.hold();
    renderPage(fake);

    expect(await screen.findByRole('status')).toHaveTextContent('Loading the statistics');
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();

    release();
    expect(await screen.findByRole('heading', { level: 2, name: 'Stretch' })).toBeInTheDocument();
  });

  it('says what went wrong and tries again on request', async () => {
    const fake = fakeHabits([stretch]);
    fake.failNext('statistics', apiError(500, { title: 'Server error' }));
    renderPage(fake);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded|Server error/i);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Stretch' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invites to add a habit when there is none', async () => {
    renderPage(fakeHabits([]));

    expect(await screen.findByText(/nothing to count yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to the habits' })).toHaveAttribute(
      'href',
      '/habits',
    );
  });

  it('shows a month that has not begun without judging anything', async () => {
    renderPage(fakeHabits([stretch]), '/statistics?month=2026-12');
    await screen.findByRole('heading', { level: 2, name: 'Stretch' });

    const card = within(cardOf('Stretch'));
    expect(card.getByText('Nothing to judge yet')).toBeInTheDocument();
    // The last day is not a thing of the month: it is still yesterday's.
    expect(card.getByText('Last done yesterday')).toBeInTheDocument();
  });
});

describe('staying current', () => {
  it('asks again when the screen is opened a second time, so a tick elsewhere shows', async () => {
    const fake = fakeHabits([read]);
    // The app keeps data fresh for 30 s (`createQueryClient`): without the query's own
    // `staleTime: 0` the second visit would show the first answer and never ask again.
    const first = renderPage(
      fake,
      '/statistics',
      new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } }),
    );
    await screen.findByRole('heading', { level: 2, name: 'Read' });
    expect(within(cardOf('Read')).getByText('Done on 0 of 2 days')).toBeInTheDocument();
    first.unmount();

    // A tick made on the habits screen, which does not know about this one.
    await fake.gateway.mark('h-read', '2026-10-02');
    renderPage(fake, '/statistics', first.queryClient);

    // The cached copy shows first; the new one replaces it.
    expect(await screen.findByText('Done on 1 of 2 days')).toBeInTheDocument();
    expect(fake.calls.statistics).toHaveLength(2);
  });
});
