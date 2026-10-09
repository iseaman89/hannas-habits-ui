import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth';
import { ToastProvider } from '@/shared/ui';
import { diaryDay, fakeDiary } from '@/test/fakeDiary';
import { fakeHabits } from '@/test/fakeHabits';
import { apiError } from '@/test/problems';
import { fakeSession, signedIn } from '@/test/fakeSession';
import { DiaryPage } from './DiaryPage';
import { diaryKeys } from './diaryQueries';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function renderPage(
  diary: ReturnType<typeof fakeDiary>,
  at = '/diary/2026-10-07',
  habits = fakeHabits(),
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider session={fakeSession(signedIn)}>
          <MemoryRouter initialEntries={[at]}>
            <Routes>
              <Route
                path="/diary/:date"
                element={<DiaryPage gateway={diary.gateway} habitsGateway={habits.gateway} />}
              />
            </Routes>
            <LocationProbe />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return { queryClient };
}

const highlight = () => screen.findByRole('textbox', { name: 'Highlight of the day' });
const location = () => screen.getByTestId('location').textContent;

/** The tab goes to the background: the page must write what it holds now. */
function hideTab() {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  delete (document as { visibilityState?: unknown }).visibilityState;
}

beforeEach(() => {
  // Only the clock: the timers stay real, so the real pause before a write can be waited for.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('opening a day', () => {
  it('shows the date as the title and the day’s kicker', async () => {
    renderPage(fakeDiary());

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wednesday, 7 October' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Daily diary')).toBeInTheDocument();
  });

  it('adds the year to the title of another year', async () => {
    renderPage(fakeDiary(), '/diary/2025-12-24');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Wednesday, 24 December 2025' }),
    ).toBeInTheDocument();
  });

  it('is an empty form for a day without an entry (the server’s 404)', async () => {
    const diary = fakeDiary();
    renderPage(diary);

    expect(await highlight()).toHaveValue('');
    expect(
      screen.getAllByRole('radio').every((radio) => !(radio as HTMLInputElement).checked),
    ).toBe(true);
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(diary.calls.load).toEqual(['2026-10-07']);
    expect(diary.calls.save).toEqual([]);
  });

  it('fills the form from the entry of that date', async () => {
    const diary = fakeDiary([
      diaryDay('2026-10-07', {
        mood: 4,
        body: 70,
        mind: 0,
        highlight: 'A long walk',
        grateful: ['Sun'],
        learned: ['Lifetimes'],
        tasks: [{ title: 'Call mum', done: true }],
      }),
    ]);
    renderPage(diary);

    expect(await highlight()).toHaveValue('A long walk');
    expect(screen.getByRole('radio', { name: 'Good' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Grateful for 1' })).toHaveValue('Sun');
    expect(screen.getByRole('textbox', { name: 'Something I learnt 1' })).toHaveValue('Lifetimes');
    expect(screen.getByRole('checkbox', { name: 'Done: Call mum' })).toBeChecked();
    // Opening a day does not write it.
    expect(diary.calls.save).toEqual([]);
  });

  it('does not offer Body and Mind', async () => {
    renderPage(fakeDiary([diaryDay('2026-10-07', { body: 70, mind: 0 })]));
    await highlight();

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Body' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mind' })).not.toBeInTheDocument();
  });

  it('greets the person by name and asks how they feel today', async () => {
    renderPage(fakeDiary());
    await highlight();

    expect(screen.getByText('Hi, Hanna')).toBeInTheDocument();
    expect(screen.getByText('How are you feeling today?')).toBeInTheDocument();
  });

  it('asks about the past on another day than today', async () => {
    renderPage(fakeDiary(), '/diary/2026-10-05');
    await highlight();

    expect(screen.getByText('Hi, Hanna')).toBeInTheDocument();
    expect(screen.getByText('How were you feeling on this day?')).toBeInTheDocument();
    expect(screen.queryByText('How are you feeling today?')).not.toBeInTheDocument();
  });

  it('sends a date that is not a real day to today', async () => {
    renderPage(fakeDiary(), '/diary/not-a-date');

    await highlight();

    expect(location()).toBe('/diary/2026-10-07');
  });

  it('sends 2026-02-30 to today as well - it matches the pattern but is no day', async () => {
    renderPage(fakeDiary(), '/diary/2026-02-30');

    await highlight();

    expect(location()).toBe('/diary/2026-10-07');
  });

  it('says so when the day cannot be loaded, and loads it on a retry', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([diaryDay('2026-10-07', { highlight: 'There' })]);
    diary.failNext('load', apiError(500));
    renderPage(diary);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Highlight of the day' })).not.toBeInTheDocument();
    // The way to the other days stays.
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await highlight()).toHaveValue('There');
  });
});

describe('moving between days', () => {
  it('goes to the day before and the day after, and not past today', async () => {
    const user = userEvent.setup();
    renderPage(fakeDiary());
    await highlight();

    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    expect(location()).toBe('/diary/2026-10-06');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tuesday, 6 October' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(location()).toBe('/diary/2026-10-07');
  });

  it('shows each day’s own text when going back and forth between days that are loaded already', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([
      diaryDay('2026-10-07', { highlight: 'Wednesday' }),
      diaryDay('2026-10-06', { highlight: 'Tuesday' }),
    ]);
    renderPage(diary);
    expect(await highlight()).toHaveValue('Wednesday');

    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    await waitFor(async () => expect(await highlight()).toHaveValue('Tuesday'));

    // Wednesday is in the cache now: its form opens at once, and must not be Tuesday's.
    await user.click(screen.getByRole('button', { name: 'Next day' }));
    expect(await highlight()).toHaveValue('Wednesday');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Wednesday, 7 October' }),
    ).toBeInTheDocument();
    expect(diary.calls.load).toEqual(['2026-10-07', '2026-10-06']);
  });

  it('crosses a month and a year boundary', async () => {
    const user = userEvent.setup();
    renderPage(fakeDiary(), '/diary/2026-01-01');
    await highlight();

    await user.click(screen.getByRole('button', { name: 'Previous day' }));

    expect(location()).toBe('/diary/2025-12-31');
  });
});

describe('autosave', () => {
  it('writes the whole day after a pause and says Saving… then Saved', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);

    await user.type(await highlight(), 'A walk');
    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(diary.calls.save).toEqual([]);

    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 3000 });
    await screen.findByText('Saved');
    expect(diary.calls.save[0]).toEqual({
      date: '2026-10-07',
      request: {
        mood: null,
        body: null,
        mind: null,
        highlight: 'A walk',
        grateful: [],
        learned: [],
        tasks: [],
      },
    });
  });

  it('writes typing as one request, not one per key', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);

    await user.type(await highlight(), 'A long walk in the park');
    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 3000 });
    await screen.findByText('Saved');

    expect(diary.calls.save).toHaveLength(1);
    expect(diary.dayOf('2026-10-07')?.highlight).toBe('A long walk in the park');
  });

  it('keeps every field in the one document: a mood, lines and a task together', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);
    await highlight();

    await user.click(screen.getByRole('radio', { name: 'Great' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Add something you are grateful for' }),
      'Sun{Enter}',
    );
    await user.type(
      screen.getByRole('textbox', { name: 'Add something you learnt' }),
      'Types{Enter}',
    );
    await user.type(screen.getByRole('textbox', { name: 'Add a task' }), 'Call mum{Enter}');
    await user.click(screen.getByRole('checkbox', { name: 'Done: Call mum' }));

    await waitFor(
      () => expect(diary.dayOf('2026-10-07')?.tasks).toEqual([{ title: 'Call mum', done: true }]),
      {
        timeout: 3000,
      },
    );
    expect(diary.dayOf('2026-10-07')).toEqual(
      diaryDay('2026-10-07', {
        mood: 5,
        grateful: ['Sun'],
        learned: ['Types'],
        tasks: [{ title: 'Call mum', done: true }],
      }),
    );
  });

  it('writes the Body and Mind of a day back unchanged although the screen does not show them', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([diaryDay('2026-10-07', { mood: 4, body: 70, mind: 0 })]);
    renderPage(diary);

    await user.type(await highlight(), 'A walk');

    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 3000 });
    expect(diary.calls.save[0]?.request).toMatchObject({
      mood: 4,
      body: 70,
      mind: 0,
      highlight: 'A walk',
    });
  });

  it('removes the entry when everything is cleared again (an empty document)', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([diaryDay('2026-10-07', { mood: 2 })]);
    renderPage(diary);
    await highlight();

    await user.click(screen.getByRole('button', { name: 'Clear mood' }));

    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 3000 });
    expect(diary.calls.save[0]?.request).toMatchObject({ mood: null, highlight: null, tasks: [] });
    expect(diary.dayOf('2026-10-07')).toBeUndefined();
  });

  it('shows the shape of the day, announced once, while the day is on its way', async () => {
    const diary = fakeDiary();
    const release = diary.hold();
    renderPage(diary);

    expect(screen.getByText('Loading the diary').parentElement).toHaveAttribute('role', 'status');
    // The header is already there: the person knows which day is coming.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Wednesday, 7 October');

    release();
    expect(await highlight()).toBeInTheDocument();
    expect(screen.queryByText('Loading the diary')).not.toBeInTheDocument();
  });

  it('never has two writes under way at once, and the last one carries everything typed', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);
    const box = await highlight();

    const release = diary.hold();
    await user.type(box, 'one');
    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 3000 });
    // The first write is on its way (held); the person keeps typing past the pause.
    await user.type(box, ' two');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(diary.calls.save).toHaveLength(1);

    release();
    await waitFor(() => expect(diary.calls.save).toHaveLength(2), { timeout: 3000 });
    await screen.findByText('Saved');

    expect(diary.mostSavesAtOnce()).toBe(1);
    expect(diary.dayOf('2026-10-07')?.highlight).toBe('one two');
  });

  it('writes at once when the person goes to another day, without waiting for the pause', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);
    await user.type(await highlight(), 'Before I go');

    await user.click(screen.getByRole('button', { name: 'Previous day' }));

    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 500 });
    expect(diary.calls.save[0]?.date).toBe('2026-10-07');
    expect(diary.calls.save[0]?.request.highlight).toBe('Before I go');
    // ... and the other day is a day of its own, still empty.
    expect(await highlight()).toHaveValue('');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(diary.calls.save).toHaveLength(1);
  });

  it('writes when the tab goes to the background', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);
    await user.type(await highlight(), 'Hidden soon');

    hideTab();

    await waitFor(() => expect(diary.calls.save).toHaveLength(1), { timeout: 500 });
  });

  it('shows the text the person left when they come back to a day whose write is still on its way', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary([diaryDay('2026-10-07', { highlight: 'Old' })]);
    renderPage(diary);
    const box = await highlight();
    await user.clear(box);
    await user.type(box, 'New');

    const release = diary.hold();
    await user.click(screen.getByRole('button', { name: 'Previous day' }));
    await screen.findByRole('heading', { level: 1, name: 'Tuesday, 6 October' });
    await user.click(await screen.findByRole('button', { name: 'Next day' }));

    // The server still has "Old" (the write is held), the screen must not go back to it.
    expect(await highlight()).toHaveValue('New');
    expect(diary.calls.load.filter((date) => date === '2026-10-07')).toHaveLength(1);

    release();
    await waitFor(() => expect(diary.dayOf('2026-10-07')?.highlight).toBe('New'));
  });
});

describe('the calendar’s lists of days', () => {
  const YEAR = { from: '2026-01-01', to: '2026-12-31' };

  it('are marked out of date once a write has gone through, so the calendar asks again', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    const { queryClient } = renderPage(diary);
    // The calendar looked at the year before: nothing written yet.
    queryClient.setQueryData(diaryKeys.daysIn(YEAR), []);
    expect(queryClient.getQueryState(diaryKeys.daysIn(YEAR))?.isInvalidated).toBe(false);

    await user.type(await highlight(), 'A walk');
    await screen.findByText('Saved', {}, { timeout: 3000 });

    expect(queryClient.getQueryState(diaryKeys.daysIn(YEAR))?.isInvalidated).toBe(true);
  });

  it('stay as they are when the write failed - the server still has the old day', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    diary.failNext('save', apiError(500));
    const { queryClient } = renderPage(diary);
    queryClient.setQueryData(diaryKeys.daysIn(YEAR), []);

    await user.type(await highlight(), 'Keep me');
    await screen.findByText('Not saved', {}, { timeout: 3000 });

    expect(queryClient.getQueryState(diaryKeys.daysIn(YEAR))?.isInvalidated).toBe(false);
  });
});

describe('after a log-out', () => {
  it('does not put the text of the person who left back into the emptied cache', async () => {
    const user = userEvent.setup();
    const { queryClient } = renderPage(fakeDiary());
    await user.type(await highlight(), 'private words');

    queryClient.clear(); // what signing out does
    cleanup(); // and the page goes away

    expect(queryClient.getQueryData(diaryKeys.day('2026-10-07'))).toBeUndefined();
  });
});

describe('when a write fails', () => {
  it('says Not saved, tells so in a toast, and the retry writes the same day', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    diary.failNext('save', apiError(500));
    renderPage(diary);
    await user.type(await highlight(), 'Keep me');

    await screen.findByText('Not saved', {}, { timeout: 3000 });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(diary.dayOf('2026-10-07')).toBeUndefined();
    // The text is still there to be saved.
    expect(await highlight()).toHaveValue('Keep me');

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    await screen.findByText('Saved');
    expect(diary.calls.save).toHaveLength(2);
    expect(diary.dayOf('2026-10-07')?.highlight).toBe('Keep me');
  });

  it('writes the next change in full, so no retry is needed once the connection is back', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    diary.failNext('save', apiError(0));
    renderPage(diary);
    const box = await highlight();
    await user.type(box, 'First');
    await screen.findByText('Not saved', {}, { timeout: 3000 });

    await user.type(box, ' and more');

    await screen.findByText('Saved', {}, { timeout: 3000 });
    expect(diary.dayOf('2026-10-07')?.highlight).toBe('First and more');
  });
});

describe('leaving the page', () => {
  it('asks the browser to confirm only while something is not written', async () => {
    const user = userEvent.setup();
    const diary = fakeDiary();
    renderPage(diary);
    const box = await highlight();

    const calm = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(calm);
    expect(calm.defaultPrevented).toBe(false);

    await user.type(box, 'x');
    const unsaved = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(unsaved);
    expect(unsaved.defaultPrevented).toBe(true);

    await screen.findByText('Saved', {}, { timeout: 3000 });
    const written = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(written);
    expect(written.defaultPrevented).toBe(false);
  });
});

describe('the habits of the day', () => {
  it('ticks a habit for the viewed day', async () => {
    const user = userEvent.setup();
    const habits = fakeHabits([
      {
        id: 'h-stretch',
        title: 'Stretch',
        schedule: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-10-01',
        completed: [],
      },
    ]);
    renderPage(fakeDiary(), '/diary/2026-10-05', habits);

    await user.click(await screen.findByRole('checkbox', { name: 'Stretch' }));

    await waitFor(() => expect(habits.calls.marks).toEqual(['mark h-stretch 2026-10-05']));
    expect(habits.calls.overview[0]).toEqual({
      from: '2026-10-05',
      to: '2026-10-05',
      asOf: '2026-10-07',
    });
  });
});
