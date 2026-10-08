import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeHabits } from '@/test/fakeHabits';
import { fakeResolutions, type FakeResolution } from '@/test/fakeResolutions';
import { apiError } from '@/test/problems';
import { ResolutionsPage } from './ResolutionsPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test (day 280 of 365).
const NOW = new Date(2026, 9, 7, 12, 0);

const read: FakeResolution = {
  id: 'r-read',
  year: 2026,
  title: 'Read twelve books',
  habitId: 'h-read',
};
const sleep: FakeResolution = { id: 'r-sleep', year: 2026, title: 'Sleep more', kept: true };
const trip: FakeResolution = { id: 'r-trip', year: 2026, title: 'Visit Lisbon' };
const lastYear: FakeResolution = { id: 'r-old', year: 2025, title: 'Learn to swim', kept: true };

const HABIT_TITLES = { 'h-read': 'Read', 'h-walk': 'Walk' };

function habitsApi() {
  const base = { description: null, startDate: '2026-01-01', completed: [] };
  return fakeHabits([
    { id: 'h-read', title: 'Read', schedule: [1, 3, 5], ...base },
    { id: 'h-walk', title: 'Walk', schedule: [0, 1, 2, 3, 4, 5, 6], ...base },
  ]);
}

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <p data-testid="location">{pathname + search}</p>;
}

function renderPage(
  fake: ReturnType<typeof fakeResolutions>,
  { at = '/resolutions', habits = habitsApi() } = {},
) {
  // The app's own staleTime: a list that is not asked again by itself would show up here.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={[at]}>
          <Routes>
            <Route
              path="/resolutions"
              element={<ResolutionsPage gateway={fake.gateway} habits={habits.gateway} />}
            />
            <Route path="/habits" element={<p>The habits screen</p>} />
          </Routes>
          <LocationProbe />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { queryClient, habits };
}

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');
const rowOf = (title: string) =>
  screen.getByText(title).closest('li') ?? (undefined as unknown as HTMLElement);
const markKept = (title: string) => screen.getByRole('button', { name: `Mark kept: ${title}` });
const kept = (title: string) =>
  screen.getByRole('button', { name: `Kept: ${title} - mark as not kept` });
const addInput = () => screen.getByRole('textbox', { name: 'Add a resolution' });

beforeEach(() => {
  // Only the clock: the timers stay real, so Testing Library's waiting keeps working.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the year', () => {
  it('asks for the current year and lists its resolutions in order, numbered', async () => {
    const fake = fakeResolutions([read, sleep, trip, lastYear], HABIT_TITLES);
    renderPage(fake);

    expect(await screen.findByRole('heading', { level: 1, name: 'My 2026' })).toBeInTheDocument();
    await screen.findByText('Read twelve books');
    expect(fake.calls.list).toEqual([2026]);
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^1Read twelve books/),
      expect.stringMatching(/^2Sleep more/),
      expect.stringMatching(/^3Visit Lisbon/),
    ]);
    expect(screen.queryByText('Learn to swim')).not.toBeInTheDocument();
  });

  it('shows which habit tracks a resolution, as a link to the habits', async () => {
    const user = userEvent.setup();
    renderPage(fakeResolutions([read, sleep], HABIT_TITLES));
    await screen.findByText('Read twelve books');

    const link = within(rowOf('Read twelve books')).getByRole('link', {
      name: 'Tracked by “Read”',
    });
    expect(within(rowOf('Sleep more')).queryByRole('link')).not.toBeInTheDocument();

    await user.click(link);

    expect(screen.getByTestId('location')).toHaveTextContent('/habits');
  });

  it('shows what is kept and what is open', async () => {
    renderPage(fakeResolutions([read, sleep], HABIT_TITLES));
    await screen.findByText('Read twelve books');

    expect(markKept('Read twelve books')).toBeInTheDocument();
    expect(kept('Sleep more')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark kept: Sleep more/ })).not.toBeInTheDocument();
  });

  it('invites the first resolution of an empty year, and still lets one be added', async () => {
    renderPage(fakeResolutions());

    expect(await screen.findByText(/No resolutions for 2026 yet/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(addInput()).toBeInTheDocument();
  });

  it('moves between years and keeps the year in the address', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, lastYear], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    expect(screen.queryByRole('button', { name: 'This year' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Previous year' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My 2025' })).toBeInTheDocument();
    expect(await screen.findByText('Learn to swim')).toBeInTheDocument();
    expect(screen.queryByText('Read twelve books')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/resolutions?year=2025');

    await user.click(screen.getByRole('button', { name: 'This year' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'My 2026' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/resolutions$/);

    // Next year's resolutions can be made in advance.
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My 2027' })).toBeInTheDocument();
    expect(await screen.findByText(/No resolutions for 2027 yet/)).toBeInTheDocument();
    expect(fake.calls.list).toEqual([2026, 2025, 2026, 2027]);
  });

  it('opens the year named in the address and falls back to this year for nonsense', async () => {
    renderPage(fakeResolutions([lastYear]), { at: '/resolutions?year=2025' });
    expect(await screen.findByRole('heading', { level: 1, name: 'My 2025' })).toBeInTheDocument();
  });

  it('falls back to the current year for an address that makes no sense', async () => {
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake, { at: '/resolutions?year=soon' });

    expect(await screen.findByRole('heading', { level: 1, name: 'My 2026' })).toBeInTheDocument();
    expect(fake.calls.list).toEqual([2026]);
  });

  it.each([
    [2000, 'Previous year'],
    [2100, 'Next year'],
  ])('stops at the server’s limits (%s)', async (year, button) => {
    renderPage(fakeResolutions(), { at: `/resolutions?year=${year}` });

    await screen.findByRole('heading', { level: 1, name: `My ${year}` });
    expect(screen.getByRole('button', { name: button })).toBeDisabled();
  });

  it('asks the server again when the screen is opened, so a habit renamed elsewhere shows as it is now', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], { ...HABIT_TITLES });
    renderPage(fake);
    await screen.findByRole('link', { name: 'Tracked by “Read”' });

    fake.habits['h-read'] = 'Reading'; // renamed on the habits screen
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    await screen.findByText(/No resolutions for 2027 yet/);
    await user.click(screen.getByRole('button', { name: 'This year' }));

    expect(await screen.findByRole('link', { name: 'Tracked by “Reading”' })).toBeInTheDocument();
  });

  it('drops the link of a habit that was deleted elsewhere, and keeps the resolution', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], { ...HABIT_TITLES });
    renderPage(fake);
    await screen.findByRole('link', { name: 'Tracked by “Read”' });

    delete fake.habits['h-read'];
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    await screen.findByText(/No resolutions for 2027 yet/);
    await user.click(screen.getByRole('button', { name: 'This year' }));

    expect(await screen.findByText('Read twelve books')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: /Tracked by/ })).toBeNull());
  });
});

describe('how far the year has come', () => {
  it('shows the share of the year behind us, from today’s date, and the count of kept ones', async () => {
    renderPage(fakeResolutions([read, sleep, trip], HABIT_TITLES));
    await screen.findByText('Read twelve books');

    expect(screen.getByRole('img', { name: '77% of 2026 is behind you' })).toBeInTheDocument();
    expect(screen.getByText('of 2026 is behind you')).toBeInTheDocument();
    expect(screen.getByText('1 of 3 resolutions kept so far — 85 days left.')).toBeInTheDocument();
  });

  it('counts again when something is marked kept', async () => {
    const user = userEvent.setup();
    renderPage(fakeResolutions([read, sleep, trip], HABIT_TITLES));
    await screen.findByText('Read twelve books');

    await user.click(markKept('Visit Lisbon'));

    expect(screen.getByText('2 of 3 resolutions kept so far — 85 days left.')).toBeInTheDocument();
  });

  it('says the year is over for a past year', async () => {
    renderPage(fakeResolutions([lastYear]), { at: '/resolutions?year=2025' });

    expect(await screen.findByText('1 of 1 resolution kept.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '100% of 2025 is behind you' })).toBeInTheDocument();
  });

  it('says a year to come has not begun', async () => {
    renderPage(fakeResolutions(), { at: '/resolutions?year=2027' });

    await screen.findByText(/No resolutions for 2027 yet/);
    expect(screen.getByRole('img', { name: '2027 has not begun yet' })).toBeInTheDocument();
    expect(screen.getByText('No resolutions yet.')).toBeInTheDocument();
  });

  it('gives no count while the list is not there', () => {
    const fake = fakeResolutions([read]);
    fake.hold();
    renderPage(fake);

    expect(screen.getByRole('img', { name: '77% of 2026 is behind you' })).toBeInTheDocument();
    expect(screen.queryByText(/resolutions? kept/)).not.toBeInTheDocument();
  });
});

describe('loading and failing', () => {
  it('waits with a spinner for the first answer', async () => {
    const fake = fakeResolutions([read], HABIT_TITLES);
    const release = fake.hold();
    renderPage(fake);

    expect(screen.getByRole('status')).toHaveTextContent('Loading resolutions');

    release();
    expect(await screen.findByText('Read twelve books')).toBeInTheDocument();
  });

  it('says what went wrong and tries again on request', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    fake.failNext('list', apiError(500, { detail: 'The list is on a break.' }));
    renderPage(fake);

    expect(await screen.findByRole('alert')).toHaveTextContent('The list is on a break.');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Read twelve books')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the list when only a refresh fails', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    await screen.findByText(/No resolutions for 2027 yet/);
    fake.failNext('list', apiError(500, { detail: 'No luck.' }));

    await user.click(screen.getByRole('button', { name: 'This year' })); // 2026 again: shown, then asked again

    await waitFor(() => expect(fake.calls.list).toEqual([2026, 2027, 2026]));
    expect(screen.getByText('Read twelve books')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('adding a resolution', () => {
  it('adds it to the shown year on Enter, at the end, and gets ready for the next one', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');

    await user.type(addInput(), '  Learn to cook  {Enter}');

    expect(await screen.findByText('Learn to cook')).toBeInTheDocument();
    expect(fake.calls.add).toEqual([
      { year: 2026, input: { title: 'Learn to cook', habitId: null } },
    ]);
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^1Read twelve books/),
      expect.stringMatching(/^2Sleep more/),
      expect.stringMatching(/^3Learn to cook/),
    ]);
    // The row is empty again and the next one can be typed at once.
    await waitFor(() => expect(addInput()).toHaveValue(''));
    expect(addInput()).toHaveFocus();
  });

  it('does not carry a half-typed line over to another year', async () => {
    const user = userEvent.setup();
    renderPage(fakeResolutions());
    await screen.findByText(/No resolutions for 2026 yet/);
    // Look at 2027 once, so that its list is there at once the next time (no spinner in between).
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    await screen.findByText(/No resolutions for 2027 yet/);
    await user.click(screen.getByRole('button', { name: 'This year' }));
    await user.type(addInput(), 'Meant for 2026');

    await user.click(screen.getByRole('button', { name: 'Next year' }));

    expect(screen.getByRole('heading', { level: 1, name: 'My 2027' })).toBeInTheDocument();
    expect(addInput()).toHaveValue('');
  });

  it('adds with the plus button as well', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);

    const plus = screen.getByRole('button', { name: 'Add resolution' });
    expect(plus).toBeDisabled(); // nothing typed yet
    await user.type(addInput(), 'Run a 10k');
    await user.click(plus);

    expect(await screen.findByText('Run a 10k')).toBeInTheDocument();
    expect(fake.calls.add).toHaveLength(1);
    // The click took the focus to the button (which is off again now): back to the input.
    await waitFor(() => expect(addInput()).toHaveFocus());
  });

  it('adds to the year that is shown, not to this year', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    renderPage(fake, { at: '/resolutions?year=2027' });
    await screen.findByText(/No resolutions for 2027 yet/);

    await user.type(addInput(), 'Plan ahead{Enter}');

    expect(await screen.findByText('Plan ahead')).toBeInTheDocument();
    expect(fake.calls.add[0]?.year).toBe(2027);
  });

  it('sends nothing for a blank line', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);

    await user.type(addInput(), '   {Enter}');

    expect(fake.calls.add).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Add resolution' })).toBeDisabled();
  });

  it('does not add anything just because the input was left', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);

    await user.type(addInput(), 'Half a thought');
    await user.tab();
    await user.tab();

    expect(fake.calls.add).toHaveLength(0);
    expect(addInput()).toHaveValue('Half a thought');
  });

  it('cannot take the title past the limit', async () => {
    renderPage(fakeResolutions());
    await screen.findByText(/No resolutions for 2026 yet/);

    expect(addInput()).toHaveAttribute('maxlength', '200');
  });

  it('sends one request for one Enter, however long the server takes', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);
    const release = fake.hold();

    await user.type(addInput(), 'Slow one{Enter}');
    await user.keyboard('{Enter}');
    release();

    expect(await screen.findByText('Slow one')).toBeInTheDocument();
    expect(fake.calls.add).toHaveLength(1);
  });

  it('shows the server’s refusal under the row and keeps what was typed', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    fake.failNext('add', apiError(400, { detail: 'A year can have at most 50 resolutions.' }));
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);

    await user.type(addInput(), 'One too many{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A year can have at most 50 resolutions.',
    );
    expect(addInput()).toHaveValue('One too many');
    expect(screen.queryByText('One too many', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('puts a complaint about the title under the row', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions();
    fake.failNext(
      'add',
      apiError(400, { fieldErrors: { title: ['A resolution needs a title.'] } }),
    );
    renderPage(fake);
    await screen.findByText(/No resolutions for 2026 yet/);

    await user.type(addInput(), 'x{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('A resolution needs a title.');
  });

  it('stops offering the row once the year holds the most it can', async () => {
    const full = Array.from({ length: 50 }, (_, index) => ({
      id: `r-${index}`,
      year: 2026,
      title: `Resolution ${index + 1}`,
    }));
    renderPage(fakeResolutions(full));

    expect(await screen.findByText('That is the most a year holds (50).')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Add a resolution' })).not.toBeInTheDocument();
  });

  it('offers it at 49', async () => {
    const nearlyFull = Array.from({ length: 49 }, (_, index) => ({
      id: `r-${index}`,
      year: 2026,
      title: `Resolution ${index + 1}`,
    }));
    renderPage(fakeResolutions(nearlyFull));

    await screen.findByText('Resolution 49');
    expect(addInput()).toBeInTheDocument();
  });
});

describe('marking kept', () => {
  it('shows it at once, sends the whole item in the background and then asks what the server holds', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    const release = fake.hold();

    await user.click(markKept('Read twelve books'));

    // The server has not answered yet, the item is already kept.
    expect(kept('Read twelve books')).toBeInTheDocument();
    expect(fake.itemsOf(2026)[0]?.kept).toBe(false);

    release();

    await waitFor(() => expect(fake.itemsOf(2026)[0]?.kept).toBe(true));
    // Title and habit travel along unchanged: the server replaces the whole item.
    expect(fake.calls.update).toEqual([
      {
        year: 2026,
        id: 'r-read',
        change: { title: 'Read twelve books', habitId: 'h-read', kept: true },
      },
    ]);
    await waitFor(() => expect(fake.calls.list).toHaveLength(2));
    expect(kept('Read twelve books')).toBeInTheDocument();
  });

  it('does not let a refresh that was already under way bring back the state from before the click', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    await user.click(screen.getByRole('button', { name: 'Next year' }));
    await screen.findByText(/No resolutions for 2027 yet/);
    const release = fake.hold();
    await user.click(screen.getByRole('button', { name: 'This year' })); // asked again, answer on hold

    await user.click(markKept('Read twelve books'));
    release();
    const releaseRefresh = fake.hold(); // the refresh after the write waits as well

    // That one is asked for once the write is through; the answer of the first (taken before the
    // click: not kept) has come in by then - and must not have been put on the screen.
    await waitFor(() => expect(fake.calls.list).toEqual([2026, 2027, 2026, 2026]));
    expect(fake.itemsOf(2026)[0]?.kept).toBe(true);
    expect(kept('Read twelve books')).toBeInTheDocument();
    releaseRefresh();
    await waitFor(() => expect(fake.calls.list).toHaveLength(4));
    expect(kept('Read twelve books')).toBeInTheDocument();
  });

  it('takes it back the same way', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([sleep]);
    renderPage(fake);
    await screen.findByText('Sleep more');

    await user.click(kept('Sleep more'));

    expect(markKept('Sleep more')).toBeInTheDocument();
    await waitFor(() => expect(fake.itemsOf(2026)[0]?.kept).toBe(false));
    expect(fake.calls.update[0]?.change.kept).toBe(false);
  });

  it('sends quick clicks one after the other, in the order of the clicks', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, trip], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    const release = fake.hold();

    await user.click(markKept('Read twelve books'));
    await user.click(kept('Read twelve books')); // and back again
    await user.click(markKept('Visit Lisbon'));
    expect(markKept('Read twelve books')).toBeInTheDocument();

    release();

    await waitFor(() => expect(fake.calls.update).toHaveLength(3));
    expect(fake.calls.update.map((call) => [call.id, call.change.kept])).toEqual([
      ['r-read', true],
      ['r-read', false],
      ['r-trip', true],
    ]);
    // Overlapping, two PUTs of one item could pass each other and leave the older state behind.
    expect(fake.mostWritesAtOnce()).toBe(1);
    await waitFor(() => expect(fake.itemsOf(2026).map((item) => item.kept)).toEqual([false, true]));
  });

  it('asks for the list once after several quick clicks, not once per click', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep, trip], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    const release = fake.hold();

    await user.click(markKept('Read twelve books'));
    await user.click(markKept('Visit Lisbon'));
    await user.click(kept('Sleep more'));
    release();

    await waitFor(() => expect(fake.calls.update).toHaveLength(3));
    await waitFor(() => expect(fake.calls.list).toHaveLength(2)); // the first load + one refresh
    expect(fake.calls.list).toHaveLength(2);
  });

  it('puts it back and says so when the server refuses it, and keeps the clicks made after it', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, trip], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    const release = fake.hold();
    fake.failNext('update', apiError(500, { detail: 'The server is having a bad day.' }));

    await user.click(markKept('Read twelve books')); // refused
    await user.click(markKept('Visit Lisbon')); // goes through
    release();

    expect(await screen.findByRole('alert')).toHaveTextContent('The server is having a bad day.');
    await waitFor(() => expect(markKept('Read twelve books')).toBeInTheDocument());
    expect(kept('Visit Lisbon')).toBeInTheDocument();
    expect(fake.itemsOf(2026).map((item) => item.kept)).toEqual([false, true]);
  });

  it('puts a refused change back even when the screen cannot ask the server what is true', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    fake.failNext('update', apiError(500, { detail: 'The save did not go through.' }));
    fake.failNext('list', apiError(500, { detail: 'And the refresh did not either.' }));

    await user.click(markKept('Read twelve books'));

    expect(await screen.findByRole('alert')).toHaveTextContent('The save did not go through.');
    await waitFor(() => expect(fake.calls.list).toHaveLength(2)); // the refresh was tried and failed
    // No refresh to repair it: the failed save itself has to put the button back.
    expect(markKept('Read twelve books')).toBeInTheDocument();
    expect(screen.getByText('Read twelve books')).toBeInTheDocument(); // and the list stays
  });
});

describe('editing a resolution', () => {
  async function openEdit(user: ReturnType<typeof userEvent.setup>, title: string) {
    await user.click(await screen.findByRole('button', { name: `Edit ${title}` }));
    return screen.findByRole('dialog', { name: 'Edit resolution' });
  }

  it('starts from the saved title and habit, and saves the new ones', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');
    const title = within(dialog).getByLabelText('What do you resolve to do?');
    const habit = within(dialog).getByLabelText('Tracked by a habit (optional)');
    expect(title).toHaveValue('Read twelve books');
    expect(habit).toHaveDisplayValue('Read');

    await user.clear(title);
    await user.type(title, 'Read fifteen books');
    await user.selectOptions(habit, 'Walk');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Read fifteen books')).toBeInTheDocument();
    expect(fake.calls.update).toEqual([
      {
        year: 2026,
        id: 'r-read',
        change: { title: 'Read fifteen books', habitId: 'h-walk', kept: false },
      },
    ]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent('Resolution saved');
    expect(screen.getByRole('link', { name: 'Tracked by “Walk”' })).toBeInTheDocument();
  });

  it('lists the person’s habits and “No habit”, and removes the link with the latter', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');
    const habit = within(dialog).getByLabelText('Tracked by a habit (optional)');
    await waitFor(() =>
      expect(
        within(habit)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual(['No habit', 'Read', 'Walk']),
    );

    await user.selectOptions(habit, 'No habit');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fake.calls.update).toHaveLength(1));
    expect(fake.calls.update[0]?.change).toEqual({
      title: 'Read twelve books',
      habitId: null,
      kept: false,
    });
    await waitFor(() => expect(screen.queryByRole('link', { name: /Tracked by/ })).toBeNull());
  });

  it('links a resolution that had no habit', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([trip], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openEdit(user, 'Visit Lisbon');
    const habit = within(dialog).getByLabelText('Tracked by a habit (optional)');
    expect(habit).toHaveDisplayValue('No habit');
    await within(habit).findByRole('option', { name: 'Walk' });

    await user.selectOptions(habit, 'Walk');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('link', { name: 'Tracked by “Walk”' })).toBeInTheDocument();
    expect(fake.calls.update[0]?.change.habitId).toBe('h-walk');
  });

  it('keeps the link while the habits are still loading, so saving a new title does not drop it', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    const habits = habitsApi();
    renderPage(fake, { habits });
    await screen.findByText('Read twelve books');
    habits.hold();

    const dialog = await openEdit(user, 'Read twelve books');
    const habit = within(dialog).getByLabelText('Tracked by a habit (optional)');

    expect(within(dialog).getByText('Loading your habits…')).toBeInTheDocument();
    expect(habit).toHaveDisplayValue('Read'); // the link is shown, not “No habit”
    const title = within(dialog).getByLabelText('What do you resolve to do?');
    await user.clear(title);
    await user.type(title, 'Read more');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fake.calls.update).toHaveLength(1));
    expect(fake.calls.update[0]?.change).toEqual({
      title: 'Read more',
      habitId: 'h-read',
      kept: false,
    });
  });

  it('says so when the habits cannot be loaded, offers another try, and still saves', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    const habits = habitsApi();
    habits.failNext('list', apiError(500, { detail: 'No habits today.' }));
    renderPage(fake, { habits });

    const dialog = await openEdit(user, 'Read twelve books');

    expect(await within(dialog).findByText('No habits today.')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Tracked by a habit (optional)')).toHaveDisplayValue(
      'Read',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(within(dialog).queryByText('No habits today.')).toBeNull());
    expect(await within(dialog).findByRole('option', { name: 'Walk' })).toBeInTheDocument();
  });

  it('carries the kept flag as it is now, not as it was when the page was opened', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    await screen.findByText('Read twelve books');
    const release = fake.hold();

    await user.click(markKept('Read twelve books')); // still on its way
    const dialog = await openEdit(user, 'Read twelve books');
    const title = within(dialog).getByLabelText('What do you resolve to do?');
    await user.clear(title);
    await user.type(title, 'Read more');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    release();

    await waitFor(() => expect(fake.calls.update).toHaveLength(2));
    expect(fake.calls.update.map((call) => call.change)).toEqual([
      { title: 'Read twelve books', habitId: 'h-read', kept: true },
      { title: 'Read more', habitId: 'h-read', kept: true },
    ]);
    expect(fake.mostWritesAtOnce()).toBe(1);
    await waitFor(() =>
      expect(fake.itemsOf(2026)[0]).toMatchObject({ title: 'Read more', kept: true }),
    );
  });

  it('sends the kept flag the list holds when it is saved, also when it changed while the dialog was open', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    const { queryClient } = renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');

    // Another device marks it kept; the list is refreshed behind the open dialog.
    await fake.gateway.update(2026, 'r-read', {
      title: 'Read twelve books',
      habitId: 'h-read',
      kept: true,
    });
    await queryClient.invalidateQueries({ queryKey: ['resolutions'] });
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(fake.calls.update).toHaveLength(2));
    expect(fake.calls.update[1]?.change.kept).toBe(true);
  });

  it('puts the server’s complaint about the habit under the select and keeps the dialog open', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    fake.failNext(
      'update',
      apiError(400, { fieldErrors: { habitId: ['That habit does not exist.'] } }),
    );
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByText('That habit does not exist.')).toBeVisible();
    expect(within(dialog).getByLabelText('Tracked by a habit (optional)')).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Edit resolution' })).toBeInTheDocument();
  });

  it('keeps the dialog open with the message when the item is gone', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    fake.failNext('update', apiError(404, { title: 'Resolution not found.' }));
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Resolution not found.');
  });

  it('does not save a blank title', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');

    await user.clear(within(dialog).getByLabelText('What do you resolve to do?'));

    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(fake.calls.update).toHaveLength(0);
  });

  it('sends nothing on cancel, and starts fresh the next time', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openEdit(user, 'Read twelve books');
    await user.type(within(dialog).getByLabelText('What do you resolve to do?'), ' and more');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const again = await openEdit(user, 'Read twelve books');

    expect(within(again).getByLabelText('What do you resolve to do?')).toHaveValue(
      'Read twelve books',
    );
    expect(fake.calls.update).toHaveLength(0);
  });

  it('closes by itself when the item is removed behind its back', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    const { queryClient } = renderPage(fake);
    await openEdit(user, 'Read twelve books');

    await fake.gateway.remove(2026, 'r-read'); // another device
    await queryClient.invalidateQueries({ queryKey: ['resolutions'] });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Read twelve books')).not.toBeInTheDocument();
  });
});

describe('deleting a resolution', () => {
  async function openDelete(user: ReturnType<typeof userEvent.setup>, title: string) {
    await user.click(await screen.findByRole('button', { name: `Delete ${title}` }));
    return screen.findByRole('dialog', { name: 'Delete this resolution?' });
  }

  it('asks first, says what goes and what stays, and sends nothing on cancel', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openDelete(user, 'Read twelve books');

    expect(dialog).toHaveTextContent('“Read twelve books” will be gone for good.');
    expect(dialog).toHaveTextContent('The habit it points to stays.');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(fake.calls.remove).toHaveLength(0);
    expect(screen.getByText('Read twelve books')).toBeInTheDocument();
  });

  it('removes it, renumbers the rest and says so', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read, sleep, trip], HABIT_TITLES);
    renderPage(fake);
    const dialog = await openDelete(user, 'Sleep more');

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Sleep more')).not.toBeInTheDocument());
    expect(fake.calls.remove).toEqual([{ year: 2026, id: 'r-sleep' }]);
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^1Read twelve books/),
      expect.stringMatching(/^2Visit Lisbon/),
    ]);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Resolution deleted'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // The one that was kept is the one that went.
    expect(screen.getByText('0 of 2 resolutions kept so far — 85 days left.')).toBeInTheDocument();
  });

  it('keeps the item and says why when the server refuses', async () => {
    const user = userEvent.setup();
    const fake = fakeResolutions([read], HABIT_TITLES);
    fake.failNext('remove', apiError(500, { detail: 'Not today.' }));
    renderPage(fake);
    const dialog = await openDelete(user, 'Read twelve books');

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Not today.');
    expect(screen.getByRole('dialog', { name: 'Delete this resolution?' })).toBeInTheDocument();
    expect(screen.getByText('Read twelve books')).toBeInTheDocument();
  });
});
