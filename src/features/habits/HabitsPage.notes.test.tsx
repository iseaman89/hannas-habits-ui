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

/** "Sport" on Mon, Wed and Fri; legs on Mondays (with a note on the 5th), arms on Mondays and Wednesdays. */
const sport = (overrides: Partial<FakeHabit> = {}): FakeHabit => ({
  id: 'h-sport',
  title: 'Sport',
  weekdays: [1, 3, 5],
  startDate: '2026-09-01',
  completed: [],
  subHabits: [
    {
      id: 's-legs',
      title: 'Legs',
      weekdays: [1],
      completed: ['2026-10-05'],
      notes: { '2026-10-05': '3 x 10, left knee odd' },
    },
    { id: 's-arms', title: 'Arms', weekdays: [1, 3] },
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

/** The grid with Sport's parts open. */
async function openParts(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('table');
  await user.click(screen.getByRole('button', { name: 'Show parts of Sport' }));
}

/** Hovers a part's cell and waits for its note field. */
async function openNote(
  user: ReturnType<typeof userEvent.setup>,
  part: string,
  cell: string,
  fieldName: string,
) {
  await user.hover(
    within(rowOf(part)).getByRole('button', { name: new RegExp(`^Sport: ${part}, ${cell}`) }),
  );
  return screen.findByRole('textbox', { name: fieldName });
}

beforeEach(() => {
  // Only the clock: the timers stay real, so Testing Library's waiting keeps working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('notes on the parts of a habit', () => {
  it('shows the stored note in a field beside the part’s cell, and marks the cell', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await openParts(user);

    const field = await openNote(user, 'Legs', 'Mon 5 Oct', 'Note for Legs, Mon 5 Oct');

    expect(field).toHaveValue('3 x 10, left knee odd');
    // The cell says it carries a note, to a screen reader as well.
    expect(
      screen.getByRole('button', { name: 'Sport: Legs, Mon 5 Oct. Note: 3 x 10, left knee odd' }),
    ).toBeInTheDocument();
  });

  it('writes a new note to the server, and the card of the habit’s cell then lists it', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);

    const field = await openNote(user, 'Arms', 'Wed 7 Oct', 'Note for Arms, Wed 7 Oct');
    await user.type(field, ' bench 3 x 8 ');
    await user.tab();

    await waitFor(() =>
      expect(fake.notesOf('h-sport', 's-arms')).toEqual([
        { date: '2026-10-07', text: 'bench 3 x 8' },
      ]),
    );
    expect(fake.calls.notes).toEqual(['set h-sport s-arms 2026-10-07 bench 3 x 8']);

    // The habit's own cell for that day now names the part with its note.
    await user.unhover(screen.getByRole('textbox', { name: 'Note for Arms, Wed 7 Oct' }));
    await user.hover(within(rowOf('Sport')).getByRole('button', { name: /^Sport, Wed 7 Oct/ }));
    const card = await screen.findByRole('group', { name: 'Parts, Sport, Wed 7 Oct' });
    expect(card).toHaveTextContent('Arms');
    expect(card).toHaveTextContent('bench 3 x 8');
  });

  it('takes the note away on the server when the field is emptied', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);

    const field = await openNote(user, 'Legs', 'Mon 5 Oct', 'Note for Legs, Mon 5 Oct');
    await user.clear(field);
    await user.tab();

    await waitFor(() => expect(fake.notesOf('h-sport', 's-legs')).toEqual([]));
    expect(fake.calls.notes).toEqual(['clear h-sport s-legs 2026-10-05']);
    // No note any more: the cell is called by its plain name again.
    expect(screen.getByRole('button', { name: 'Sport: Legs, Mon 5 Oct' })).toBeInTheDocument();
  });

  it('changes the cell at once, before the server has answered', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);
    const release = fake.hold();

    const field = await openNote(user, 'Arms', 'Wed 7 Oct', 'Note for Arms, Wed 7 Oct');
    await user.type(field, 'felt heavy');
    await user.tab();

    expect(
      await screen.findByRole('button', { name: 'Sport: Arms, Wed 7 Oct. Note: felt heavy' }),
    ).toBeInTheDocument();
    expect(fake.notesOf('h-sport', 's-arms')).toEqual([]); // the server has not written it yet
    release();
    await waitFor(() => expect(fake.notesOf('h-sport', 's-arms')).toHaveLength(1));
  });

  it('keeps the note out of the way of the ticks: a tick does not touch it, nor a note the tick', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);

    await user.click(screen.getByRole('button', { name: /^Sport: Legs, Mon 5 Oct/ })); // takes the tick back

    await waitFor(() =>
      expect(fake.calls.marks).toEqual(['unmark-part h-sport s-legs 2026-10-05']),
    );
    expect(fake.notesOf('h-sport', 's-legs')).toEqual([
      { date: '2026-10-05', text: '3 x 10, left knee odd' },
    ]);
    expect(
      screen.getByRole('button', { name: 'Sport: Legs, Mon 5 Oct. Note: 3 x 10, left knee odd' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('says so when the note could not be written, and shows what the server holds', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);
    fake.failNext('setSubHabitNote', apiError(500, { detail: 'Not today.' }));

    const field = await openNote(user, 'Arms', 'Wed 7 Oct', 'Note for Arms, Wed 7 Oct');
    await user.type(field, 'lost?');
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent('Not today.');
    // The screen asked the server again: no note there, so no dot on the cell.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sport: Arms, Wed 7 Oct' })).toBeInTheDocument(),
    );
    expect(fake.notesOf('h-sport', 's-arms')).toEqual([]);
  });

  it('sends a second write of a note only when the first one is through', async () => {
    const user = userEvent.setup();
    const fake = fakeHabits([sport()]);
    renderPage(fake);
    await openParts(user);
    const release = fake.hold();

    const field = await openNote(user, 'Arms', 'Wed 7 Oct', 'Note for Arms, Wed 7 Oct');
    await user.type(field, 'first');
    await user.tab(); // the first write is under way, held at the server
    await waitFor(() => expect(fake.calls.notes).toHaveLength(1));

    await user.click(screen.getByRole('textbox', { name: 'Note for Arms, Wed 7 Oct' }));
    await user.type(screen.getByRole('textbox', { name: 'Note for Arms, Wed 7 Oct' }), ' and more');
    await user.tab();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fake.calls.notes).toHaveLength(1); // queued behind the first, not racing it

    release();

    await waitFor(() =>
      expect(fake.calls.notes).toEqual([
        'set h-sport s-arms 2026-10-07 first',
        'set h-sport s-arms 2026-10-07 first and more',
      ]),
    );
    expect(fake.notesOf('h-sport', 's-arms')).toEqual([
      { date: '2026-10-07', text: 'first and more' },
    ]);
  });

  it('lists on the habit’s cell the parts that have a note that day, with it', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    await user.hover(within(rowOf('Sport')).getByRole('button', { name: /^Sport, Mon 5 Oct/ }));

    const card = await screen.findByRole('group', { name: 'Parts, Sport, Mon 5 Oct' });
    // Arms is due that day as well, but has no note: it is not named.
    expect(
      within(card)
        .getAllByRole('listitem')
        .map((part) => part.textContent),
    ).toEqual(['Legs3 x 10, left knee odd']);
  });

  it('shows no card on the habit’s cell on a day whose parts have no note', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await screen.findByRole('table');

    await user.hover(within(rowOf('Sport')).getByRole('button', { name: 'Sport, Wed 7 Oct' }));
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
  });

  it('shows the card once a note was written, and not before', async () => {
    const user = userEvent.setup();
    renderPage(fakeHabits([sport()]));
    await openParts(user);

    const field = await openNote(user, 'Arms', 'Wed 7 Oct', 'Note for Arms, Wed 7 Oct');
    await user.type(field, 'felt heavy');
    await user.tab();
    await user.unhover(screen.getByRole('textbox', { name: 'Note for Arms, Wed 7 Oct' }));
    await user.hover(within(rowOf('Sport')).getByRole('button', { name: /^Sport, Wed 7 Oct/ }));

    const card = await screen.findByRole('group', { name: 'Parts, Sport, Wed 7 Oct' });
    expect(card).toHaveTextContent('Arms');
    expect(card).toHaveTextContent('felt heavy');
  });
});
