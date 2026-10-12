import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeHabits, type FakeHabit } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { HabitsPage } from './HabitsPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

const stretch: FakeHabit = {
  id: 'h-stretch',
  title: 'Stretch',
  description: 'Ten minutes, every morning',
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

function renderPage(fake: ReturnType<typeof fakeHabits>, at = '/habits') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[at]}>
          <Routes>
            <Route path="/habits" element={<HabitsPage gateway={fake.gateway} />} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const rowOf = (title: string) =>
  screen.getByRole('rowheader', { name: new RegExp(`^${title}`) }).closest('tr') as HTMLElement;

const streakOf = (title: string) =>
  within(rowOf(title))
    .getByRole('img', { name: /^Current streak/ })
    .getAttribute('aria-label');

const cell = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
  // Only the clock: the timers stay real, so Testing Library's waiting keeps working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the month', () => {
  it('asks for the current month with the client’s today and shows every habit', async () => {
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    await screen.findByRole('table');
    expect(fake.calls.overview).toEqual([
      { from: '2026-10-01', to: '2026-10-31', asOf: '2026-10-07' },
    ]);
    expect(rowOf('Stretch')).toHaveTextContent('Every day');
    expect(rowOf('Read')).toHaveTextContent('Mon · Wed · Fri');
    expect(streakOf('Stretch')).toBe('Current streak: 2');
    expect(streakOf('Read')).toBe('Current streak: 0');
  });

  it('moves "today" on when the tab was left open over midnight, and asks for the streak again', async () => {
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    expect(screen.getByRole('columnheader', { current: 'date' })).toHaveTextContent(
      'Wednesday 7 October',
    );
    expect(fake.calls.overview.at(-1)?.asOf).toBe('2026-10-07');

    // Overnight: the clock is on the next day, the person comes back to the tab.
    vi.setSystemTime(new Date(2026, 9, 8, 7, 30));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(fake.calls.overview.at(-1)?.asOf).toBe('2026-10-08'));
    // (The grid is asked for again under the new day, so it is back a moment later.)
    expect(await screen.findByRole('columnheader', { current: 'date' })).toHaveTextContent(
      'Thursday 8 October',
    );
  });

  it('draws each day by what it is: done, open, due, upcoming, not planned, not started', async () => {
    renderPage(
      fakeHabits([stretch, read, { ...read, id: 'h-new', title: 'Walk', startDate: '2026-10-06' }]),
    );
    await screen.findByRole('table');

    // done / missed (past, open) / due today
    expect(cell('Stretch, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Stretch, Thu 1 Oct')).toHaveAttribute('aria-pressed', 'false');
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');
    // not buttons: tomorrow, a day outside the plan, a day before the habit existed
    expect(screen.getByRole('img', { name: 'Stretch, Thu 8 Oct: upcoming' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stretch, Thu 8 Oct' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Read, Tue 6 Oct: not scheduled' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Walk, Mon 5 Oct: before the habit started' }),
    ).toBeInTheDocument();
    // a planned day that is still to come has no button either
    expect(screen.getByRole('img', { name: 'Read, Fri 9 Oct: upcoming' })).toBeInTheDocument();
  });

  it('marks today in the day header', async () => {
    renderPage(fakeHabits([stretch]));
    await screen.findByRole('table');

    const today = screen.getByRole('columnheader', { name: /Wednesday 7 October/ });
    expect(today).toHaveAttribute('aria-current', 'date');
    expect(screen.getByRole('columnheader', { name: /Thursday 8 October/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('moves between months and keeps the month in the address', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: 'This month' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next month' }));

    expect(await screen.findByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/habits?month=2026-11');
    expect(fake.calls.overview.at(-1)).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
      asOf: '2026-10-07',
    });

    await user.click(screen.getByRole('button', { name: 'This month' }));

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/habits$/);

    await user.click(screen.getByRole('button', { name: 'Previous month' }));

    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument();
    // Stretch did not exist yet in September: nothing is "missed" there.
    expect(
      await screen.findByRole('img', { name: 'Stretch, Tue 1 Sep: before the habit started' }),
    ).toBeInTheDocument();
  });

  it('opens the month named in the address and shows as many day columns as it has days', async () => {
    renderPage(fakeHabits([stretch]), '/habits?month=2028-02');

    expect(await screen.findByRole('heading', { name: 'February 2028' })).toBeInTheDocument();
    await screen.findByRole('table');
    // the habit column + 29 days (a leap year) + the streak column
    expect(screen.getAllByRole('columnheader')).toHaveLength(31);
  });

  it('falls back to the current month for an address that makes no sense', async () => {
    renderPage(fakeHabits([stretch]), '/habits?month=soon');

    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });
});

// Just after and just before midnight, local time: in any time zone except UTC one of the two is
// on a different calendar day in UTC, so a date taken from toISOString() would be wrong.
describe.each([
  [new Date(2026, 9, 7, 0, 30), 'just after midnight'],
  [new Date(2026, 9, 7, 23, 30), 'just before midnight'],
])('the client’s own today (%s, %s)', (now) => {
  it('is what the overview is asked for and what a new habit starts on', async () => {
    vi.setSystemTime(now);
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'New habit' }));
    const dialog = await screen.findByRole('dialog', { name: 'New habit' });
    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Meditate');
    await user.click(within(dialog).getByRole('button', { name: /^Add habit/ }));
    await waitFor(() => expect(fake.calls.create).toHaveLength(1));

    expect(fake.calls.overview[0]).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
      asOf: '2026-10-07',
    });
    expect(fake.calls.create[0]?.startDate).toBe('2026-10-07');
    expect(cell('Stretch, Wed 7 Oct')).toBeInTheDocument(); // due today, so a button
  });
});

describe('ticking a day', () => {
  it('shows it at once, sends it in the background and then shows the new streak', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();

    await user.click(cell('Stretch, Wed 7 Oct'));

    // The server has not answered yet, the cell is already done - and the streak is still the old one.
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(streakOf('Stretch')).toBe('Current streak: 2');

    release();

    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 3'));
    expect(fake.calls.marks).toEqual(['mark h-stretch 2026-10-07']);
    expect(fake.marksOf('h-stretch')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'true');
  });

  it('takes a mark back the same way', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(cell('Stretch, Mon 5 Oct'));

    expect(cell('Stretch, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 1'));
    expect(fake.calls.marks).toEqual(['unmark h-stretch 2026-10-05']);
  });

  it('sends two quick clicks on one cell one after the other, in the order of the clicks', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();

    await user.click(cell('Stretch, Wed 7 Oct'));
    await user.click(cell('Stretch, Wed 7 Oct'));
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');

    release();

    await waitFor(() =>
      expect(fake.calls.marks).toEqual([
        'mark h-stretch 2026-10-07',
        'unmark h-stretch 2026-10-07',
      ]),
    );
    // Overlapping, a PUT and a DELETE could pass each other and leave the day marked on the server.
    expect(fake.mostMarksAtOnce()).toBe(1);
    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 2'));
    expect(fake.marksOf('h-stretch')).toEqual(['2026-10-05', '2026-10-06']);
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');
  });

  it('asks for the streak once after several quick ticks, not once per tick', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();

    await user.click(cell('Stretch, Thu 1 Oct'));
    await user.click(cell('Stretch, Fri 2 Oct'));
    await user.click(cell('Stretch, Sat 3 Oct'));
    release();

    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 5'));
    expect(fake.calls.overview).toHaveLength(2); // the first load + one refresh
  });

  it('puts a day back and says so when the server refuses it, and keeps the ticks made after it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();
    fake.failNext('mark', apiError(500, { detail: 'The server is having a bad day.' }));

    await user.click(cell('Stretch, Wed 7 Oct')); // this one is refused
    await user.click(cell('Stretch, Tue 6 Oct')); // done before: taken back, goes through
    release();

    expect(await screen.findByRole('alert')).toHaveTextContent('The server is having a bad day.');
    await waitFor(() =>
      expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false'),
    );
    expect(cell('Stretch, Tue 6 Oct')).toHaveAttribute('aria-pressed', 'false');
    expect(fake.marksOf('h-stretch')).toEqual(['2026-10-05']);
    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 1'));
  });

  it('puts a refused day back even when the screen cannot ask the server what is true, and keeps the grid', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    fake.failNext('mark', apiError(500, { detail: 'The save did not go through.' }));
    fake.failNext('overview', apiError(500, { detail: 'And the refresh did not either.' }));

    await user.click(cell('Stretch, Wed 7 Oct'));

    expect(await screen.findByRole('alert')).toHaveTextContent('The save did not go through.');
    await waitFor(() => expect(fake.calls.overview).toHaveLength(2)); // the refresh was tried and failed
    // No refresh to repair it: the cell has to be put back by the failed save itself.
    expect(cell('Stretch, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');
    expect(streakOf('Stretch')).toBe('Current streak: 2');
  });

  it('does not make a failure out of taking back a day another device already cleared', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    // The gateway swallows the 404; here the fake simply succeeds - the screen must show no alert.
    await user.click(cell('Stretch, Mon 5 Oct'));

    await waitFor(() => expect(streakOf('Stretch')).toBe('Current streak: 1'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('loading, empty and failing', () => {
  it('waits with a spinner for the first answer', async () => {
    const fake = fakeHabits([stretch]);
    const release = fake.hold();
    renderPage(fake);

    expect(screen.getByRole('status')).toHaveTextContent('Loading habits');

    release();
    expect(await screen.findByRole('rowheader', { name: /Stretch/ })).toBeInTheDocument();
  });

  it('invites the first habit when there is none', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits());

    await screen.findByText(/No habits yet/);
    await user.click(screen.getByRole('button', { name: 'Add your first habit' }));

    expect(await screen.findByRole('dialog', { name: 'New habit' })).toBeInTheDocument();
  });

  it('says what went wrong and tries again on request', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    fake.failNext('overview', apiError(500, { detail: 'The habits are on a break.' }));
    renderPage(fake);

    expect(await screen.findByRole('alert')).toHaveTextContent('The habits are on a break.');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('rowheader', { name: /Stretch/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('adding a habit', () => {
  async function openDialog(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'New habit' }));
    return screen.findByRole('dialog', { name: 'New habit' });
  }

  it('creates it from today on, closes the dialog and shows it in the grid', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Meditate');
    await user.click(within(dialog).getByRole('button', { name: 'Weekdays' }));
    expect(within(dialog).getByRole('button', { name: 'Add habit · 5×/week' })).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Add habit · 5×/week' }));

    expect(await screen.findByRole('rowheader', { name: /Meditate/ })).toBeInTheDocument();
    expect(fake.calls.create).toEqual([
      {
        title: 'Meditate',
        description: null,
        recurrence: { kind: 'weekly', weekdays: [1, 2, 3, 4, 5], interval: 1 },
        startDate: '2026-10-07',
      },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Habit added');
    // A habit that starts today has nothing "missed" before today.
    expect(
      screen.getByRole('img', { name: 'Meditate, Tue 6 Oct: before the habit started' }),
    ).toBeInTheDocument();
    expect(cell('Meditate, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts the server’s complaint under the field and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    fake.failNext(
      'create',
      apiError(400, { fieldErrors: { title: ['A habit with this name already exists.'] } }),
    );
    renderPage(fake);
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Stretch');
    await user.click(within(dialog).getByRole('button', { name: /^Add habit/ }));

    expect(await within(dialog).findByText('A habit with this name already exists.')).toBeVisible();
    expect(within(dialog).getByLabelText('What do you want to do?')).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'New habit' })).toBeInTheDocument();
  });

  it('starts fresh every time the dialog opens', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([stretch]));
    const dialog = await openDialog(user);
    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Half a thought');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const again = await openDialog(user);

    expect(within(again).getByLabelText('What do you want to do?')).toHaveValue('');
  });
});

describe('editing a habit', () => {
  async function openEdit(user: ReturnType<typeof userEvent.setup>, title: string) {
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: `Edit ${title}` }));
    return screen.findByRole('dialog', { name: 'Edit habit' });
  }

  it('fills the form from the habit itself, description included, and saves the whole habit', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);
    const dialog = await openEdit(user, 'Stretch');

    // The overview has no description: it comes from the habit's own request.
    const title = await within(dialog).findByLabelText('What do you want to do?');
    expect(title).toHaveValue('Stretch');
    expect(within(dialog).getByLabelText('Note (optional)')).toHaveValue(
      'Ten minutes, every morning',
    );
    expect(fake.calls.details).toEqual(['h-stretch']);

    await user.clear(title);
    await user.type(title, 'Stretch more');
    await user.click(within(dialog).getByRole('button', { name: 'Sunday' })); // off
    await user.click(within(dialog).getByRole('button', { name: /^Save changes · 6×\/week$/ }));

    expect(await screen.findByRole('rowheader', { name: /Stretch more/ })).toBeInTheDocument();
    expect(fake.calls.update).toEqual([
      {
        id: 'h-stretch',
        input: {
          title: 'Stretch more',
          description: 'Ten minutes, every morning',
          recurrence: { kind: 'weekly', weekdays: [1, 2, 3, 4, 5, 6], interval: 1 },
          startDate: '2026-10-01',
        },
      },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Habit saved');
  });

  it('lets an earlier start date make earlier days tickable', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake, '/habits?month=2026-09');
    const before = await screen.findByRole('img', {
      name: 'Stretch, Sun 20 Sep: before the habit started',
    });
    expect(before).toBeInTheDocument();
    const dialog = await openEdit(user, 'Stretch');

    expect(await within(dialog).findByLabelText('Starts on')).toHaveValue('2026-10-01');
    fireEvent.change(within(dialog).getByLabelText('Starts on'), {
      target: { value: '2026-09-20' },
    });
    await user.click(within(dialog).getByRole('button', { name: /^Save changes/ }));

    await waitFor(() => expect(fake.calls.update[0]?.input.startDate).toBe('2026-09-20'));
    await user.click(await screen.findByRole('button', { name: 'Stretch, Sun 20 Sep' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Stretch, Sun 20 Sep' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('sends a cleared note as "no note"', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    const dialog = await openEdit(user, 'Stretch');

    await user.clear(await within(dialog).findByLabelText('Note (optional)'));
    await user.click(within(dialog).getByRole('button', { name: /^Save changes/ }));

    await waitFor(() => expect(fake.calls.update[0]?.input.description).toBeNull());
  });

  it('shows the habit as it is now, not as it was when the dialog was last open', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    const first = await openEdit(user, 'Stretch');
    expect(await within(first).findByLabelText('What do you want to do?')).toHaveValue('Stretch');
    await user.click(within(first).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Another device renames it in the meantime.
    await fake.gateway.update('h-stretch', {
      title: 'Stretch and breathe',
      description: null,
      recurrence: { kind: 'weekly', weekdays: [1], interval: 1 },
      startDate: '2026-10-01',
    });
    const second = await openEdit(user, 'Stretch');

    expect(await within(second).findByLabelText('What do you want to do?')).toHaveValue(
      'Stretch and breathe',
    );
  });

  it('says so when the habit cannot be loaded, and can try again', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    fake.failNext('details', apiError(500, { detail: 'Could not reach the habit.' }));
    renderPage(fake);
    const dialog = await openEdit(user, 'Stretch');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Could not reach the habit.',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));

    expect(await within(dialog).findByLabelText('What do you want to do?')).toHaveValue('Stretch');
  });
});

describe('deleting a habit', () => {
  async function openDelete(user: ReturnType<typeof userEvent.setup>, title: string) {
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: `Delete ${title}` }));
    return screen.findByRole('dialog', { name: 'Delete this habit?' });
  }

  it('asks first, naming the habit', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);

    const dialog = await openDelete(user, 'Read');
    expect(dialog).toHaveTextContent('“Read”');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fake.calls.remove).toEqual([]);
    expect(screen.getByRole('rowheader', { name: /Read/ })).toBeInTheDocument();
  });

  it('deletes it after the confirmation and takes it out of the grid', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    renderPage(fake);

    const dialog = await openDelete(user, 'Read');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(screen.queryByRole('rowheader', { name: /Read/ })).not.toBeInTheDocument(),
    );
    expect(fake.calls.remove).toEqual(['h-read']);
    expect(screen.getByRole('rowheader', { name: /Stretch/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Habit deleted');
  });

  it('keeps the dialog and the habit when the server says no', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch, read]);
    fake.failNext('remove', apiError(500, { detail: 'Not today.' }));
    renderPage(fake);

    const dialog = await openDelete(user, 'Read');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Not today.');
    expect(screen.getByRole('rowheader', { name: /Read/ })).toBeInTheDocument();
  });
});

describe('recurrence rules', () => {
  // Saturday 31 October is the last Saturday of the month; Saturday 17 the third one.
  const lastSaturday: FakeHabit = {
    id: 'h-market',
    title: 'Market day',
    recurrence: {
      kind: 'monthlyOnWeekday',
      weekdays: [],
      interval: 1,
      anchor: null,
      occurrence: 'last',
      weekday: 6,
      dayOfMonth: null,
      times: null,
    },
    startDate: '2026-09-01',
    completed: [],
  };

  async function openEdit(user: ReturnType<typeof userEvent.setup>, title: string) {
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: `Edit ${title}` }));
    return screen.findByRole('dialog', { name: 'Edit habit' });
  }

  it('draws the days the server names as due, and the rule in words under the habit', async () => {
    const fake = fakeHabits([lastSaturday]);
    renderPage(fake);
    await screen.findByRole('table');

    expect(within(rowOf('Market day')).getByText('Last Saturday of the month')).toBeInTheDocument();
    // The 31st is the one day; every other Saturday is not on the plan, and no weekday logic of
    // the client may decide otherwise.
    expect(
      screen.getByRole('img', { name: 'Market day, Sat 31 Oct: upcoming' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Market day, Sat 10 Oct: not scheduled' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Market day, Sun 4 Oct: not scheduled' }),
    ).toBeInTheDocument();
  });

  it('follows the server when a day the rule names is today: tickable, and counted', async () => {
    const onToday: FakeHabit = {
      ...lastSaturday,
      id: 'h-monthly',
      title: 'Pay rent',
      recurrence: {
        ...lastSaturday.recurrence!,
        kind: 'monthlyOnDate',
        dayOfMonth: 7,
        weekday: null,
        occurrence: null,
      },
    };
    const user = userEvent.setup();
    const fake = fakeHabits([onToday]);
    renderPage(fake);

    await user.click(await screen.findByRole('button', { name: 'Pay rent, Wed 7 Oct' }));

    expect(fake.marksOf('h-monthly')).toEqual(['2026-10-07']);
  });

  it('adds a habit that repeats every other week, counted from its start date', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'New habit' }));
    const dialog = await screen.findByRole('dialog', { name: 'New habit' });

    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Laundry');
    await user.click(within(dialog).getByRole('button', { name: 'Weekends' }));
    const weeks = within(dialog).getByLabelText('Every how many weeks?');
    await user.clear(weeks);
    await user.type(weeks, '2');

    expect(
      within(dialog).getByText(
        'Every 2nd week on weekends, starting with the week of Mon 5 Oct 2026',
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Add habit' }));

    await waitFor(() => expect(fake.calls.create).toHaveLength(1));
    // No anchor of its own: the server counts from the start date it saves.
    expect(fake.calls.create[0]?.recurrence).toEqual({
      kind: 'weekly',
      weekdays: [6, 0],
      interval: 2,
    });
    // This week (Sat 10, Sun 11 are not before the start: it starts Wed 7): due. The next ones are not.
    expect(
      await screen.findByRole('img', { name: 'Laundry, Sat 10 Oct: upcoming' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Laundry, Sat 17 Oct: not scheduled' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Laundry, Sat 24 Oct: upcoming' })).toBeInTheDocument();
  });

  it('saves a changed rule, says it re-judges the past, and redraws the grid from the server', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    const dialog = await openEdit(user, 'Stretch');
    await within(dialog).findByLabelText('What do you want to do?');
    // Nothing changed yet: nothing to warn about.
    expect(within(dialog).queryByText(/also applies to days that have passed/)).toBeNull();

    await user.selectOptions(within(dialog).getByLabelText('Repeat'), 'monthlyOnWeekday');
    await user.selectOptions(within(dialog).getByLabelText('Which one?'), 'last');
    await user.selectOptions(within(dialog).getByLabelText('Weekday'), 'Saturday');

    expect(within(dialog).getByText('Last Saturday of the month')).toBeInTheDocument();
    expect(within(dialog).getByText(/also applies to days that have passed/)).toBeInTheDocument();
    // "3×/week" is not true of this rule.
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(fake.calls.update[0]?.input.recurrence).toEqual({
        kind: 'monthlyOnWeekday',
        occurrence: 'last',
        weekday: 6,
      }),
    );
    // Monday 5 Oct was done, and is not due any more: kept on the server, drawn as not scheduled.
    expect(
      await screen.findByRole('img', { name: 'Stretch, Mon 5 Oct: not scheduled' }),
    ).toBeInTheDocument();
    expect(fake.marksOf('h-stretch')).toEqual(['2026-10-05', '2026-10-06']);
  });

  it('keeps the rhythm of a habit when its start date is moved', async () => {
    const everyOtherWeek: FakeHabit = {
      id: 'h-bins',
      title: 'Bins out',
      recurrence: {
        kind: 'weekly',
        weekdays: [3],
        interval: 2,
        anchor: '2026-10-07',
        occurrence: null,
        weekday: null,
        dayOfMonth: null,
        times: null,
      },
      startDate: '2026-10-01',
      completed: [],
    };
    const user = userEvent.setup();
    const fake = fakeHabits([everyOtherWeek]);
    renderPage(fake);
    const dialog = await openEdit(user, 'Bins out');
    await within(dialog).findByLabelText('What do you want to do?');

    fireEvent.change(within(dialog).getByLabelText('Starts on'), {
      target: { value: '2026-09-01' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    // The anchor it had goes back as it was - not the new start date.
    await waitFor(() =>
      expect(fake.calls.update[0]?.input.recurrence).toEqual({
        kind: 'weekly',
        weekdays: [3],
        interval: 2,
        anchor: '2026-10-07',
      }),
    );
    expect(fake.calls.update[0]?.input.startDate).toBe('2026-09-01');
  });
});

describe('a quota ("3 times a week")', () => {
  // Today is Wednesday 7 October: the week of 5 - 11 October has two of its three.
  const gym: FakeHabit = {
    id: 'h-gym',
    title: 'Gym',
    recurrence: {
      kind: 'timesPerWeek',
      weekdays: [],
      interval: 1,
      anchor: null,
      occurrence: null,
      weekday: null,
      dayOfMonth: null,
      times: 3,
    },
    startDate: '2026-09-01',
    completed: ['2026-10-05', '2026-10-06'],
  };

  it('says the rule and how far this week has come, and counts the streak in weeks', async () => {
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');

    expect(within(rowOf('Gym')).getByText('3 times a week · 2 of 3 this week')).toBeInTheDocument();
    expect(streakOf('Gym')).toBe('Current streak: 2 weeks');
  });

  it('draws no day as missed: a past day that was not ticked is open and can be ticked', async () => {
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');

    // Fri 2 Oct was neither done nor "due": the server lists it, and it is open.
    expect(cell('Gym, Fri 2 Oct')).toHaveAttribute('aria-pressed', 'false');
    expect(cell('Gym, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Gym, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false'); // today
    expect(screen.queryByRole('img', { name: /Gym.*missed/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Gym, Thu 8 Oct: upcoming' })).toBeInTheDocument();
  });

  it('moves the number of the week at once when a day is ticked, and the streak after the answer', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(cell('Gym, Wed 7 Oct'));

    expect(within(rowOf('Gym')).getByText('3 times a week · 3 of 3 this week')).toBeInTheDocument();
    await waitFor(() => expect(streakOf('Gym')).toBe('Current streak: 3 weeks'));
    expect(fake.marksOf('h-gym')).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('takes a day back out of the week', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(cell('Gym, Mon 5 Oct'));

    expect(within(rowOf('Gym')).getByText('3 times a week · 1 of 3 this week')).toBeInTheDocument();
    await waitFor(() => expect(fake.marksOf('h-gym')).toEqual(['2026-10-06']));
  });

  it('counts a day of the week before into that week, not into this one', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(cell('Gym, Sun 4 Oct'));

    // Sunday 4 October is the last day of the week before: this week's number stays.
    expect(within(rowOf('Gym')).getByText('3 times a week · 2 of 3 this week')).toBeInTheDocument();
    await waitFor(() => expect(fake.marksOf('h-gym')).toContain('2026-10-04'));
  });

  it('explains the open ring in the legend only when there is such a habit', async () => {
    const withQuota = fakeHabits([gym]);
    renderPage(withQuota);
    await screen.findByRole('table');

    expect(screen.getByText('Not done (any day counts)')).toBeInTheDocument();
  });

  it('has no such legend entry for habits with due days', async () => {
    renderPage(fakeHabits([stretch]));
    await screen.findByRole('table');

    expect(screen.queryByText('Not done (any day counts)')).not.toBeInTheDocument();
  });

  it('shows only the rule in a month that does not hold this week', async () => {
    const fake = fakeHabits([gym]);
    renderPage(fake, '/habits?month=2026-08');
    await screen.findByRole('table');

    expect(within(rowOf('Gym')).getByText('3 times a week')).toBeInTheDocument();
    expect(within(rowOf('Gym')).queryByText(/this week/)).not.toBeInTheDocument();
  });

  it('adds a habit that is done a number of times a week', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([stretch]);
    renderPage(fake);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'New habit' }));
    const dialog = await screen.findByRole('dialog', { name: 'New habit' });

    await user.type(within(dialog).getByLabelText('What do you want to do?'), 'Swim');
    await user.selectOptions(within(dialog).getByLabelText('Repeat'), 'timesPerWeek');
    await user.click(within(dialog).getByRole('button', { name: /^Add habit/ }));

    await waitFor(() => expect(fake.calls.create).toHaveLength(1));
    expect(fake.calls.create[0]?.recurrence).toEqual({ kind: 'timesPerWeek', times: 3 });
    // It starts today: the week has none of its three yet.
    expect(
      await within(await screen.findByRole('table')).findByText(
        '3 times a week · 0 of 3 this week',
      ),
    ).toBeInTheDocument();
    expect(cell('Swim, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'false');
  });

  it('edits the count', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([gym]);
    renderPage(fake);
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: 'Edit Gym' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit habit' });

    const times = await within(dialog).findByLabelText('How many times a week?');
    expect(times).toHaveValue(3);
    await user.clear(times);
    await user.type(times, '4');
    await user.click(within(dialog).getByRole('button', { name: /^Save changes/ }));

    await waitFor(() =>
      expect(fake.calls.update[0]?.input.recurrence).toEqual({ kind: 'timesPerWeek', times: 4 }),
    );
    expect(await screen.findByText('4 times a week · 2 of 4 this week')).toBeInTheDocument();
  });
});

describe('the statistics link', () => {
  it('opens the statistics of the month on screen', async () => {
    renderPage(fakeHabits([stretch]));
    await screen.findByRole('table');

    // The current month keeps the address clean.
    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/statistics');
  });

  it('carries another month along', async () => {
    renderPage(fakeHabits([stretch]), '/habits?month=2026-09');
    await screen.findByRole('table');

    expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute(
      'href',
      '/statistics?month=2026-09',
    );
  });
});
