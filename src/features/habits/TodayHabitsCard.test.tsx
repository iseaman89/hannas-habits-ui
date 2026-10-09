import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeHabits, type FakeHabit } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { TodayHabitsCard } from './TodayHabitsCard';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

const stretch: FakeHabit = {
  id: 'h-stretch',
  title: 'Stretch',
  schedule: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-10-01',
  completed: ['2026-10-05', '2026-10-06'],
};
const read: FakeHabit = {
  id: 'h-read',
  title: 'Read',
  schedule: [1, 3, 5], // Mon, Wed, Fri
  startDate: '2026-09-01',
  completed: [],
};
const run: FakeHabit = {
  id: 'h-run',
  title: 'Run',
  schedule: [2, 4], // Tue, Thu
  startDate: '2026-09-01',
  completed: [],
};
const newcomer: FakeHabit = {
  id: 'h-new',
  title: 'Meditate',
  schedule: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-10-08', // starts tomorrow
  completed: [],
};

function renderCard(fake: ReturnType<typeof fakeHabits>, date = '2026-10-07') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <TodayHabitsCard date={date} gateway={fake.gateway} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the habits of a day', () => {
  it('announces the loading once, and goes when the habits are there', async () => {
    const fake = fakeHabits([stretch]);
    const release = fake.hold();
    renderCard(fake);

    expect(screen.getByRole('status')).toHaveTextContent('Loading habits');

    release();
    await screen.findByRole('checkbox', { name: 'Stretch' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('asks for just that day, with the client’s today for the streak', async () => {
    const fake = fakeHabits([stretch]);
    renderCard(fake, '2026-10-05');

    await screen.findByRole('checkbox', { name: 'Stretch' });

    expect(fake.calls.overview).toEqual([
      { from: '2026-10-05', to: '2026-10-05', asOf: '2026-10-07' },
    ]);
  });

  it('lists the habits planned for the weekday, and leaves out the others and those not started yet', async () => {
    const fake = fakeHabits([stretch, read, run, newcomer]);
    renderCard(fake); // Wednesday

    await screen.findByRole('checkbox', { name: 'Stretch' });

    expect(screen.getAllByRole('checkbox').map((box) => box.getAttribute('aria-label'))).toEqual([
      'Stretch',
      'Read',
    ]);
  });

  it('shows what is done and counts it', async () => {
    const fake = fakeHabits([{ ...stretch, completed: ['2026-10-07'] }, read]);
    renderCard(fake);

    expect(await screen.findByRole('checkbox', { name: 'Stretch' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Read' })).not.toBeChecked();
    expect(screen.getByRole('link', { name: /1 of 2/ })).toHaveAttribute('href', '/habits');
  });

  it('shows each habit’s current streak', async () => {
    const fake = fakeHabits([stretch]);
    renderCard(fake);

    const row = (await screen.findByRole('checkbox', { name: 'Stretch' })).closest('li')!;

    expect(within(row).getByRole('img', { name: 'Current streak: 2' })).toBeInTheDocument();
  });

  it('calls the card “Today’s habits” today and “Habits of the day” on any other day', async () => {
    const fake = fakeHabits([stretch]);
    renderCard(fake);
    expect(await screen.findByRole('heading', { name: 'Today’s habits' })).toBeInTheDocument();
  });

  it('is “Habits of the day” for a past day', async () => {
    const fake = fakeHabits([stretch]);
    renderCard(fake, '2026-10-05');
    expect(await screen.findByRole('heading', { name: 'Habits of the day' })).toBeInTheDocument();
  });

  it('says so when nothing is planned', async () => {
    const fake = fakeHabits([run]);
    renderCard(fake); // Wednesday

    expect(await screen.findByText('Nothing is planned for this day.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /0 of 0/ })).toBeInTheDocument();
  });
});

describe('ticking', () => {
  it('marks the viewed day, not today, and changes the box at once', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderCard(fake, '2026-10-05');
    // A day that is already done: take it back.
    const box = await screen.findByRole('checkbox', { name: 'Stretch' });
    expect(box).toBeChecked();

    await user.click(box);

    expect(box).not.toBeChecked();
    await waitFor(() => expect(fake.calls.marks).toEqual(['unmark h-stretch 2026-10-05']));
  });

  it('marks an open habit as done and updates the count', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderCard(fake);

    await user.click(await screen.findByRole('checkbox', { name: 'Read' }));

    await waitFor(() => expect(fake.calls.marks).toEqual(['mark h-read 2026-10-07']));
    expect(screen.getByRole('link', { name: /1 of 2/ })).toBeInTheDocument();
  });

  it('cannot tick a day that has not come yet', async () => {
    const fake = fakeHabits([stretch]);
    renderCard(fake, '2026-10-09');

    expect(await screen.findByRole('checkbox', { name: 'Stretch' })).toBeDisabled();
  });
});

describe('when the habits cannot be had', () => {
  it('says so and offers to try again', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    fake.failNext('overview', apiError(500));
    renderCard(fake);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('checkbox', { name: 'Stretch' })).toBeInTheDocument();
  });
});
