import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeHabits, type FakeHabit } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { HabitsPage } from './HabitsPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

/**
 * "Sport" on Mon, Wed and Fri, with three parts: legs on Mondays, arms on Mondays and Wednesdays,
 * core on Fridays. Legs is done on Monday 5 October already.
 */
const sport = (overrides: Partial<FakeHabit> = {}): FakeHabit => ({
  id: 'h-sport',
  title: 'Sport',
  weekdays: [1, 3, 5],
  startDate: '2026-09-01',
  completed: [],
  subHabits: [
    { id: 's-legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
    { id: 's-arms', title: 'Arms', weekdays: [1, 3] },
    { id: 's-core', title: 'Core', weekdays: [5] },
  ],
  ...overrides,
});

function renderPage(fake: ReturnType<typeof fakeHabits>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/habits']}>
          <Routes>
            <Route path="/habits" element={<HabitsPage gateway={fake.gateway} />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const rowOf = (title: string) =>
  screen.getByRole('rowheader', { name: new RegExp(`^${title}`) }).closest('tr') as HTMLElement;

const cell = (name: string) => screen.getByRole('button', { name });
const partsOf = (name: string) =>
  screen.getByRole('button', { name: new RegExp(`^Parts, ${name}: `) });

beforeEach(() => {
  // Only the clock: the timers stay real, so Testing Library's waiting keeps working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the parts in the grid', () => {
  it('shows how many of the day’s parts are done under the days they are due', async () => {
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('1/2');
    expect(partsOf('Sport, Wed 7 Oct')).toHaveTextContent('0/1');
    expect(partsOf('Sport, Fri 9 Oct')).toHaveTextContent('0/1');
    // Nothing on the days no part is due, and the rule line counts the parts.
    expect(within(rowOf('Sport')).queryByRole('button', { name: /Tue 6 Oct/ })).toBeNull();
    expect(within(rowOf('Sport')).getByText('Mon · Wed · Fri · 3 parts')).toBeInTheDocument();
  });

  it('explains the "1/2" in the legend', async () => {
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    expect(screen.getByText(/Parts done that day/)).toBeInTheDocument();
  });

  it('has no such legend entry while no habit has parts', async () => {
    renderPage(fakeHabits([sport({ subHabits: [] })]));
    await screen.findByRole('table');

    expect(screen.queryByText(/Parts done that day/)).not.toBeInTheDocument();
  });
});

describe('ticking the parts of a day', () => {
  async function openDay(user: ReturnType<typeof userEvent.setup>, name: string, title: string) {
    await user.click(partsOf(name));
    return screen.findByRole('dialog', { name: title });
  }

  it('lists the parts due that day, with the done ones ticked', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    const dialog = await openDay(user, 'Sport, Mon 5 Oct', 'Parts for Monday 5 October');

    expect(within(dialog).getByText('Sport')).toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: 'Sport: Legs' })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' })).not.toBeChecked();
    // Core is a Friday part.
    expect(within(dialog).queryByRole('checkbox', { name: 'Sport: Core' })).toBeNull();
  });

  it('shows a tick at once, sends it, and completes the habit’s day with the last part', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    const dialog = await openDay(user, 'Sport, Mon 5 Oct', 'Parts for Monday 5 October');
    const release = fake.hold();

    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' }));

    // The server has not answered: the box, the "2/2" and the habit's cell already say done.
    expect(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' })).toBeChecked();
    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('2/2');
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');

    release();

    await waitFor(() => expect(fake.marksOf('h-sport')).toEqual(['2026-10-05']));
    expect(fake.calls.marks).toEqual(['mark-part h-sport s-arms 2026-10-05']);
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
  });

  it('takes the habit’s day back when a part is taken back', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({
        completed: ['2026-10-05'],
        subHabits: [
          { id: 's-legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
          { id: 's-arms', title: 'Arms', weekdays: [1], completed: ['2026-10-05'] },
        ],
      }),
    ]);
    renderPage(fake);
    await screen.findByRole('table');
    const dialog = await openDay(user, 'Sport, Mon 5 Oct', 'Parts for Monday 5 October');

    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Legs' }));

    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('1/2');
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(fake.marksOf('h-sport')).toEqual([]));
    expect(fake.calls.marks).toEqual(['unmark-part h-sport s-legs 2026-10-05']);
  });

  it('keeps the parts of a day to come to be seen, not ticked', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    const dialog = await openDay(user, 'Sport, Fri 9 Oct', 'Parts for Friday 9 October');

    expect(within(dialog).getByRole('checkbox', { name: 'Sport: Core' })).toBeDisabled();
    expect(dialog).toHaveTextContent('has not come yet');
  });

  it('puts a tick back and says so when the server refuses it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    const dialog = await openDay(user, 'Sport, Mon 5 Oct', 'Parts for Monday 5 October');
    fake.failNext('markSubHabit', apiError(500, { detail: 'Not today.' }));

    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Not today.');
    await waitFor(() =>
      expect(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' })).not.toBeChecked(),
    );
    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('1/2');
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
  });

  it('puts a refused tick back even when the screen cannot ask the server what is true', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    const dialog = await openDay(user, 'Sport, Mon 5 Oct', 'Parts for Monday 5 October');
    fake.failNext('markSubHabit', apiError(500, { detail: 'The save did not go through.' }));
    fake.failNext('overview', apiError(500, { detail: 'And the refresh did not either.' }));

    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The save did not go through.');
    await waitFor(() => expect(fake.calls.overview).toHaveLength(2)); // tried and failed
    // No refresh to repair it: the failed save itself has to put the tick - and the day - back.
    expect(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' })).not.toBeChecked();
    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('1/2');
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
  });

  it('queues a part’s tick behind a habit’s own tick, in the order of the clicks', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();

    // Wednesday 7 October: the habit's tick ticks Arms, then Arms is taken back by hand.
    await user.click(cell('Sport, Wed 7 Oct'));
    const dialog = await openDay(user, 'Sport, Wed 7 Oct', 'Parts for Wednesday 7 October');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' }));
    release();

    await waitFor(() =>
      expect(fake.calls.marks).toEqual([
        'mark h-sport 2026-10-07',
        'unmark-part h-sport s-arms 2026-10-07',
      ]),
    );
    expect(fake.mostMarksAtOnce()).toBe(1);
    await waitFor(() => expect(fake.marksOf('h-sport')).toEqual([]));
    expect(partsOf('Sport, Wed 7 Oct')).toHaveTextContent('0/1');
  });
});

describe('the parts as rows under the habit', () => {
  const show = (user: ReturnType<typeof userEvent.setup>) =>
    user.click(screen.getByRole('button', { name: 'Show parts of Sport' }));

  it('opens and closes the rows of the parts with the button of the habit', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');
    expect(screen.queryByRole('rowheader', { name: /^Legs/ })).toBeNull();

    await show(user);

    for (const part of ['Legs', 'Arms', 'Core']) {
      expect(
        screen.getByRole('rowheader', { name: new RegExp(`^${part} of Sport`) }),
      ).toBeVisible();
    }

    await user.click(screen.getByRole('button', { name: 'Hide parts of Sport' }));

    expect(screen.queryByRole('rowheader', { name: /^Legs/ })).toBeNull();
  });

  it('ticks one part from its row, and completes the habit’s day with the last one', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    await show(user);

    // Wednesday: Arms is the only part due, so it is the whole day.
    await user.click(cell('Sport: Arms, Wed 7 Oct'));

    expect(cell('Sport: Arms, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Sport, Wed 7 Oct')).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(fake.marksOf('h-sport')).toEqual(['2026-10-07']));
    expect(fake.calls.marks).toEqual(['mark-part h-sport s-arms 2026-10-07']);
  });

  it('takes a part back from its row, and the habit’s day with it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({
        completed: ['2026-10-05'],
        subHabits: [
          { id: 's-legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
          { id: 's-arms', title: 'Arms', weekdays: [1], completed: ['2026-10-05'] },
        ],
      }),
    ]);
    renderPage(fake);
    await screen.findByRole('table');
    await show(user);

    await user.click(cell('Sport: Legs, Mon 5 Oct'));

    expect(cell('Sport: Legs, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
    expect(cell('Sport: Arms, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Sport, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() =>
      expect(fake.calls.marks).toEqual(['unmark-part h-sport s-legs 2026-10-05']),
    );
  });

  it('shows the parts ticked by the habit’s own cell', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');
    await show(user);

    await user.click(cell('Sport, Mon 5 Oct'));

    expect(cell('Sport: Legs, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
    expect(cell('Sport: Arms, Mon 5 Oct')).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the habit open while the months are paged through', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');
    await show(user);

    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(await screen.findByRole('button', { name: 'Hide parts of Sport' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByRole('button', { name: 'Hide parts of Sport' })).toBeVisible();
    expect(screen.getByRole('rowheader', { name: /^Legs of Sport/ })).toBeVisible();
  });
});

describe('ticking the habit’s own day', () => {
  it('ticks the parts that are due that day', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');

    await user.click(cell('Sport, Mon 5 Oct'));

    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('2/2');
    await waitFor(() => expect(fake.calls.marks).toEqual(['mark h-sport 2026-10-05']));
    expect(fake.partsOf('h-sport').map((part) => part.completed)).toEqual([
      ['2026-10-05'],
      ['2026-10-05'],
      [],
    ]);
  });

  it('clears the parts of the day when the day is taken back', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({
        completed: ['2026-10-05'],
        subHabits: [
          { id: 's-legs', title: 'Legs', weekdays: [1], completed: ['2026-10-05'] },
          { id: 's-arms', title: 'Arms', weekdays: [1], completed: ['2026-10-05'] },
        ],
      }),
    ]);
    renderPage(fake);
    await screen.findByRole('table');
    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('2/2');

    await user.click(cell('Sport, Mon 5 Oct'));

    expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('0/2');
    await waitFor(() =>
      expect(fake.partsOf('h-sport').map((part) => part.completed)).toEqual([[], []]),
    );
  });

  it('asks for the streak and the parts once after the last of several ticks', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await screen.findByRole('table');
    const release = fake.hold();

    await user.click(cell('Sport, Mon 5 Oct'));
    await user.click(cell('Sport, Wed 7 Oct'));
    await user.click(partsOf('Sport, Mon 5 Oct'));
    const dialog = await screen.findByRole('dialog', { name: 'Parts for Monday 5 October' });
    await user.click(within(dialog).getByRole('checkbox', { name: 'Sport: Arms' }));
    release();

    await waitFor(() => expect(fake.calls.marks).toHaveLength(3));
    await waitFor(() => expect(fake.calls.overview).toHaveLength(2)); // the first load + one refresh
  });
});

describe('managing the parts', () => {
  async function openParts(user: ReturnType<typeof userEvent.setup>, title = 'Sport') {
    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: `Parts of ${title}` }));
    return screen.findByRole('dialog', { name: `Parts of ${title}` });
  }

  it('lists the parts with the days they are planned on', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));

    const dialog = await openParts(user);

    const list = within(dialog).getByRole('region', { name: 'Parts' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('Legs')).toBeInTheDocument();
    expect(within(list).getByText('Mon · Wed')).toBeInTheDocument(); // Arms
    expect(within(list).getByText('Fri')).toBeInTheDocument(); // Core
  });

  it('adds a part on the days chosen from the habit’s own', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport({ subHabits: [] })]);
    renderPage(fake);

    // A habit without parts opens straight on the form, every one of its days switched on.
    const dialog = await openParts(user);
    expect(within(dialog).getByRole('button', { name: 'Monday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(within(dialog).getByLabelText('Name of the part'), '  Legs ');
    await user.click(within(dialog).getByRole('button', { name: 'Wednesday' }));
    await user.click(within(dialog).getByRole('button', { name: 'Friday' }));
    await user.click(within(dialog).getByRole('button', { name: 'Add part' }));

    await waitFor(() => expect(fake.calls.parts).toEqual(['add h-sport Legs']));
    expect(fake.partsOf('h-sport')).toEqual([
      { id: 'part-1', title: 'Legs', weekdays: [1], completed: [] },
    ]);
    // The list shows it, the form is gone, and the grid counts it and shows it on its days.
    const list = await within(dialog).findByRole('region', { name: 'Parts' });
    expect(within(list).getByText('Legs')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Name of the part')).not.toBeInTheDocument();
    await waitFor(() => expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('0/1'));
    expect(within(rowOf('Sport')).getByText('Mon · Wed · Fri · 1 part')).toBeInTheDocument();
  });

  it('offers only the habit’s days: a day it is not planned on cannot be switched on', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport({ subHabits: [] })]));

    const dialog = await openParts(user);

    expect(within(dialog).getByRole('button', { name: 'Tuesday' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Monday' })).toBeEnabled();
    // No shortcuts for a habit with only some days.
    expect(within(dialog).queryByRole('button', { name: 'Weekdays' })).not.toBeInTheDocument();
  });

  it('offers every day, and the shortcuts, for a habit that is on every day', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport({ weekdays: [0, 1, 2, 3, 4, 5, 6], subHabits: [] })]));

    const dialog = await openParts(user);

    expect(within(dialog).getByRole('button', { name: 'Tuesday' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Weekends' })).toBeInTheDocument();
  });

  it('asks for a name and a day before it sends anything', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport({ subHabits: [] })]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Add part' }));
    expect(await within(dialog).findByText('Give the part a name.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Name of the part'), 'Legs');
    for (const day of ['Monday', 'Wednesday', 'Friday']) {
      await user.click(within(dialog).getByRole('button', { name: day }));
    }
    await user.click(within(dialog).getByRole('button', { name: 'Add part' }));

    expect(await within(dialog).findByText('Pick at least one day.')).toBeInTheDocument();
    expect(fake.calls.parts).toEqual([]);
  });

  it('keeps the form and the typed name when the server refuses, and says why', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    const dialog = await openParts(user);
    await user.click(within(dialog).getByRole('button', { name: 'Add a part' }));

    await user.type(within(dialog).getByLabelText('Name of the part'), 'legs');
    await user.click(within(dialog).getByRole('button', { name: 'Add part' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      "The habit already has a sub-habit called 'legs'.",
    );
    expect(within(dialog).getByLabelText('Name of the part')).toHaveValue('legs');
    expect(fake.partsOf('h-sport')).toHaveLength(3);
  });

  it('goes back from the add form without adding', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Add a part' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(within(dialog).queryByLabelText('Name of the part')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Add a part' })).toBeInTheDocument();
    expect(fake.calls.parts).toEqual([]);
  });

  it('changes the name and the days of a part, its ticks staying', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Change Legs' }));
    const name = within(dialog).getByLabelText('Name of the part');
    await user.clear(name);
    await user.type(name, 'Quads');
    await user.click(within(dialog).getByRole('button', { name: 'Wednesday' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fake.calls.parts).toEqual(['update h-sport s-legs Quads']));
    expect(fake.partsOf('h-sport')[0]).toEqual({
      id: 's-legs',
      title: 'Quads',
      weekdays: [1, 3],
      completed: ['2026-10-05'],
    });
    expect(await within(dialog).findByText('Quads')).toBeInTheDocument();
    // The grid has it on Wednesday as well now: legs and arms are due.
    await waitFor(() => expect(partsOf('Sport, Wed 7 Oct')).toHaveTextContent('0/2'));
  });

  it('removes a part after asking, and the grid forgets it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Remove Legs' }));
    expect(dialog).toHaveTextContent('Remove “Legs”?');
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(fake.calls.parts).toEqual(['remove h-sport s-legs']));
    await waitFor(() =>
      expect(within(dialog).queryByRole('button', { name: 'Change Legs' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('status')).toHaveTextContent('“Legs” removed.');
    await waitFor(() => expect(partsOf('Sport, Mon 5 Oct')).toHaveTextContent('0/1'));
  });

  it('leaves the part alone when the removal is not confirmed', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Remove Legs' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(within(dialog).getByRole('button', { name: 'Change Legs' })).toBeInTheDocument();
    expect(fake.calls.parts).toEqual([]);
  });

  it('keeps the part and says so when the server will not remove it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    fake.failNext('removeSubHabit', apiError(500, { detail: 'Not today.' }));
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Remove Legs' }));
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Not today.');
    expect(fake.partsOf('h-sport')).toHaveLength(3);
  });

  it('says so when a part has a day the habit is no longer planned on', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({
        subHabits: [
          { id: 's-swim', title: 'Swim', weekdays: [1, 2] },
          { id: 's-run', title: 'Run', weekdays: [2, 4] },
        ],
      }),
    ]);
    renderPage(fake);

    const dialog = await openParts(user);

    expect(dialog).toHaveTextContent(
      'Not due on Tue: the habit is not planned on that day any more.',
    );
    expect(dialog).toHaveTextContent('Never due: the habit is not planned on Tue, Thu any more.');
  });

  it('can still rename a part that has such a day, and can switch the day off', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({ subHabits: [{ id: 's-swim', title: 'Swim', weekdays: [1, 2] }] }),
    ]);
    renderPage(fake);
    const dialog = await openParts(user);

    await user.click(within(dialog).getByRole('button', { name: 'Change Swim' }));
    // Tuesday is on, so it can be switched off - and nothing else outside the habit can be on.
    expect(within(dialog).getByRole('button', { name: 'Tuesday' })).toBeEnabled();
    expect(within(dialog).getByRole('button', { name: 'Thursday' })).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Tuesday' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(fake.partsOf('h-sport')[0]).toMatchObject({ title: 'Swim', weekdays: [1] }),
    );
    await waitFor(() => expect(dialog).not.toHaveTextContent('Not due on'));
  });

  it('stops offering more at ten parts', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([
      sport({
        subHabits: Array.from({ length: 10 }, (_, n) => ({
          id: `s-${n}`,
          title: `Part ${n}`,
          weekdays: [1 as const],
        })),
      }),
    ]);
    renderPage(fake);

    const dialog = await openParts(user);

    expect(dialog).toHaveTextContent('at most 10 parts');
    expect(within(dialog).queryByRole('button', { name: 'Add a part' })).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Name of the part')).not.toBeInTheDocument();
  });
});
