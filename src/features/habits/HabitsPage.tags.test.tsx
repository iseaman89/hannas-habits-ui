import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/shared/ui';
import { fakeHabits, type FakeHabit } from '@/test/fakeHabits';
import { fakeTags } from '@/test/fakeTags';
import { apiError } from '@/test/problems';
import { createTagBook } from '@/test/tagBook';
import { HabitsPage } from './HabitsPage';

// Wednesday 7 October 2026, around noon: the client's "today" in every test.
const NOW = new Date(2026, 9, 7, 12, 0);

const stretch: FakeHabit = {
  id: 'h-stretch',
  title: 'Stretch',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  startDate: '2026-10-01',
  completed: ['2026-10-05'],
};

const read: FakeHabit = {
  id: 'h-read',
  title: 'Read',
  weekdays: [1, 3, 5], // Mon, Wed, Fri
  startDate: '2026-09-01',
  completed: [],
};

/** Three tags; `sick` is on two of Stretch's days, `trip` on one of Read's. */
function setup() {
  const book = createTagBook([
    { id: 't-sick', name: 'sick' },
    { id: 't-trip', name: 'trip' },
    { id: 't-flu', name: 'flu' },
  ]);
  book.attach('h-stretch', '2026-10-05', 't-sick');
  book.attach('h-stretch', '2026-10-06', 't-sick');
  book.attach('h-read', '2026-10-02', 't-trip');

  const habits = fakeHabits([stretch, read], { tagBook: book });
  const tags = fakeTags(book);
  return { book, habits, tags };
}

function renderPage({ habits, tags }: ReturnType<typeof setup>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/habits']}>
          <Routes>
            <Route
              path="/habits"
              element={<HabitsPage gateway={habits.gateway} tagsGateway={tags.gateway} />}
            />
          </Routes>
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

const dot = (name: string | RegExp) => screen.findByRole('button', { name });
const dialog = (name: string) => screen.findByRole('dialog', { name });

async function openDay(user: ReturnType<typeof userEvent.setup>, dotName: string | RegExp) {
  await user.click(await dot(dotName));
  return dialog('Tags for Wednesday 7 October');
}

describe('the dots in the grid', () => {
  it('shows a day’s tags in the dot’s name and tooltip, an empty day offers to add', async () => {
    renderPage(setup());

    const tagged = await dot('Tags, Stretch, Mon 5 Oct: sick');
    expect(tagged).toHaveAttribute('title', 'sick');
    expect(await dot('Add tags, Stretch, Wed 7 Oct')).toHaveAttribute('title', 'Add tags');
    // Another habit's day with the same date is its own.
    expect(await dot('Tags, Read, Fri 2 Oct: trip')).toBeInTheDocument();
  });

  it('is there for days that cannot be ticked as well', async () => {
    renderPage(setup());

    // Read is not due on Tuesday 6 October, Stretch has not begun on 30 September, and
    // Friday 9 October is still to come.
    expect(await dot('Add tags, Read, Tue 6 Oct')).toBeInTheDocument();
    expect(await dot('Add tags, Read, Fri 9 Oct')).toBeInTheDocument();
  });

  it('leaves the tick alone: the cell and the dot are two buttons', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);

    await user.click(await screen.findByRole('button', { name: 'Stretch, Wed 7 Oct' }));

    await waitFor(() => expect(stand.habits.calls.marks).toEqual(['mark h-stretch 2026-10-07']));
    expect(stand.habits.calls.tags).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('tagging a day', () => {
  it('opens for the day with the tags it has and the habit’s own tags first as suggestions', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);

    const box = await user
      .click(await dot('Tags, Stretch, Tue 6 Oct: sick'))
      .then(() => dialog('Tags for Tuesday 6 October'));

    expect(within(box).getByText('Stretch')).toBeInTheDocument();
    const onDay = within(box).getByRole('region', { name: 'Tags on this day' });
    expect(within(onDay).getByText('sick')).toBeInTheDocument();
    // What the day carries is not suggested again; the rest comes in the server's order.
    const suggestions = await within(box).findByRole('region', { name: 'Suggestions' });
    const names = within(suggestions)
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'));
    expect(names).toEqual(['Add tag trip', 'Add tag flu']);
    expect(stand.tags.calls.list).toContain('h-stretch');
  });

  it('puts an existing tag on the day at once and writes it in the background', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    await user.click(await within(box).findByRole('button', { name: 'Add tag trip' }));

    expect(within(box).getByRole('button', { name: 'Remove tag trip' })).toBeInTheDocument();
    await waitFor(() =>
      expect(stand.habits.calls.tags).toEqual(['tag h-stretch 2026-10-07 t-trip']),
    );
    expect(stand.book.dayTags('h-stretch', '2026-10-07')).toEqual([{ id: 't-trip', name: 'trip' }]);
    // The dot behind the dialog shows it too.
    expect(await dot('Tags, Stretch, Wed 7 Oct: trip')).toBeInTheDocument();
  });

  it('takes a tag off the day', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await user
      .click(await dot('Tags, Stretch, Tue 6 Oct: sick'))
      .then(() => dialog('Tags for Tuesday 6 October'));

    await user.click(within(box).getByRole('button', { name: 'Remove tag sick' }));

    await waitFor(() =>
      expect(stand.habits.calls.tags).toEqual(['untag h-stretch 2026-10-06 t-sick']),
    );
    expect(await within(box).findByText('No tags on this day yet.')).toBeInTheDocument();
    expect(await dot('Add tags, Stretch, Tue 6 Oct')).toBeInTheDocument();
    // …and it is a suggestion again.
    expect(await within(box).findByRole('button', { name: 'Add tag sick' })).toBeInTheDocument();
  });

  it('is independent of the done mark: a missed day can be tagged', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await user
      .click(await dot('Tags, Stretch, Tue 6 Oct: sick'))
      .then(() => dialog('Tags for Tuesday 6 October'));

    await user.click(await within(box).findByRole('button', { name: 'Add tag flu' }));

    await waitFor(() =>
      expect(stand.habits.calls.tags).toEqual(['tag h-stretch 2026-10-06 t-flu']),
    );
    expect(stand.habits.calls.marks).toEqual([]);
  });

  it('writes a quick put and take-off one after the other', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    await within(box).findByRole('button', { name: 'Add tag trip' });

    const release = stand.habits.hold();
    await user.click(within(box).getByRole('button', { name: 'Add tag trip' }));
    await user.click(await within(box).findByRole('button', { name: 'Remove tag trip' }));

    // The second request waits for the first: only one has been sent.
    expect(stand.habits.calls.tags).toEqual(['tag h-stretch 2026-10-07 t-trip']);
    release();
    await waitFor(() =>
      expect(stand.habits.calls.tags).toEqual([
        'tag h-stretch 2026-10-07 t-trip',
        'untag h-stretch 2026-10-07 t-trip',
      ]),
    );
    await waitFor(() => expect(stand.book.dayTags('h-stretch', '2026-10-07')).toEqual([]));
    expect(await dot('Add tags, Stretch, Wed 7 Oct')).toBeInTheDocument();
    // The server is asked what is true once, after the last of them - not once per click.
    expect(stand.habits.calls.overview).toHaveLength(2); // the first load + one refresh
  });

  it('undoes a tag that could not be saved and says so', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    const add = await within(box).findByRole('button', { name: 'Add tag trip' });
    stand.habits.failNext('tagDay', apiError(500, { detail: 'The tag did not go through.' }));
    // The refresh that follows fails as well: nothing but the undo itself can repair the chip.
    stand.habits.failNext('overview', apiError(500, { detail: 'And neither did the refresh.' }));

    await user.click(add);

    expect(await screen.findByRole('alert')).toHaveTextContent('The tag did not go through.');
    await waitFor(() => expect(stand.habits.calls.overview).toHaveLength(2));
    expect(within(box).queryByRole('button', { name: 'Remove tag trip' })).not.toBeInTheDocument();
    expect(await within(box).findByRole('button', { name: 'Add tag trip' })).toBeInTheDocument();
    expect(await dot('Add tags, Stretch, Wed 7 Oct')).toBeInTheDocument();
  });

  it('puts a tag back that could not be taken off', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await user
      .click(await dot('Tags, Stretch, Tue 6 Oct: sick'))
      .then(() => dialog('Tags for Tuesday 6 October'));
    stand.habits.failNext('untagDay', apiError(500, { detail: 'The tag stays.' }));
    stand.habits.failNext('overview', apiError(500));

    await user.click(within(box).getByRole('button', { name: 'Remove tag sick' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The tag stays.');
    await waitFor(() => expect(stand.habits.calls.overview).toHaveLength(2));
    expect(within(box).getByRole('button', { name: 'Remove tag sick' })).toBeInTheDocument();
    expect(await dot('Tags, Stretch, Tue 6 Oct: sick')).toBeInTheDocument();
  });
});

describe('typing a name', () => {
  it('narrows the suggestions and offers to create a name that is not there', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    await within(box).findByRole('button', { name: 'Add tag trip' });

    await user.type(within(box).getByLabelText('Add a tag'), 'tr');

    expect(within(box).getByRole('button', { name: 'Add tag trip' })).toBeInTheDocument();
    expect(within(box).queryByRole('button', { name: 'Add tag flu' })).not.toBeInTheDocument();
    expect(within(box).getByRole('button', { name: 'Create “tr”' })).toBeInTheDocument();
  });

  it('does not offer to create a name that exists, whatever its case', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    await within(box).findByRole('button', { name: 'Add tag trip' });

    await user.type(within(box).getByLabelText('Add a tag'), 'TRIP');

    expect(within(box).queryByRole('button', { name: /^Create/ })).not.toBeInTheDocument();
  });

  it('puts the existing tag on the day when Enter is pressed on its name', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    await within(box).findByRole('button', { name: 'Add tag trip' });

    await user.type(within(box).getByLabelText('Add a tag'), 'Trip{Enter}');

    await waitFor(() =>
      expect(stand.habits.calls.tags).toEqual(['tag h-stretch 2026-10-07 t-trip']),
    );
    expect(stand.tags.calls.create).toEqual([]);
    expect(within(box).getByLabelText('Add a tag')).toHaveValue('');
  });

  it('makes a new tag on Enter, trimmed, and puts it on the day', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    await user.type(within(box).getByLabelText('Add a tag'), '  on holiday {Enter}');

    expect(
      await within(box).findByRole('button', { name: 'Remove tag on holiday' }),
    ).toBeInTheDocument();
    expect(stand.tags.calls.create).toEqual(['on holiday']);
    expect(stand.book.dayTags('h-stretch', '2026-10-07')).toEqual([
      { id: 'tag-new-1', name: 'on holiday' },
    ]);
    expect(within(box).getByLabelText('Add a tag')).toHaveValue('');
    expect(await dot('Tags, Stretch, Wed 7 Oct: on holiday')).toBeInTheDocument();
  });

  it('makes a new tag with the Create chip', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    await user.type(within(box).getByLabelText('Add a tag'), 'cold');
    await user.click(within(box).getByRole('button', { name: 'Create “cold”' }));

    expect(await within(box).findByRole('button', { name: 'Remove tag cold' })).toBeInTheDocument();
  });

  it('uses the name the server returns when it already had the tag', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    // The list the dialog has does not know this tag yet (made on another device).
    stand.book.tags.push({ id: 't-late', name: 'Late' });
    await within(box).findByRole('button', { name: 'Add tag trip' });

    await user.type(within(box).getByLabelText('Add a tag'), 'late{Enter}');

    expect(await within(box).findByRole('button', { name: 'Remove tag Late' })).toBeInTheDocument();
    expect(stand.book.dayTags('h-stretch', '2026-10-07')).toEqual([{ id: 't-late', name: 'Late' }]);
  });

  it('keeps what was typed and says why when the tag cannot be made', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');
    stand.tags.failNext('create', apiError(400, { detail: 'You can have at most 200 tags.' }));

    await user.type(within(box).getByLabelText('Add a tag'), 'cold{Enter}');

    expect(await within(box).findByRole('alert')).toHaveTextContent('at most 200 tags');
    expect(within(box).getByLabelText('Add a tag')).toHaveValue('cold');
    expect(stand.habits.calls.tags).toEqual([]);
  });

  it('stops the field at the server’s limit of 30 characters', async () => {
    renderPage(setup());
    const user = userEvent.setup();
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    expect(within(box).getByLabelText('Add a tag')).toHaveAttribute('maxlength', '30');
  });

  it('does nothing for a blank field', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    await user.type(within(box).getByLabelText('Add a tag'), '   {Enter}');

    expect(stand.tags.calls.create).toEqual([]);
    expect(stand.habits.calls.tags).toEqual([]);
  });
});

describe('a full day', () => {
  it('takes no more than ten tags and says so', async () => {
    const stand = setup();
    for (let n = 1; n <= 10; n++) {
      stand.book.tags.push({ id: `t-${n}`, name: `tag ${String(n).padStart(2, '0')}` });
      stand.book.attach('h-stretch', '2026-10-07', `t-${n}`);
    }
    const user = userEvent.setup();
    renderPage(stand);

    const box = await openDay(user, /^Tags, Stretch, Wed 7 Oct:/);

    expect(within(box).getByText(/at most 10 tags/)).toBeInTheDocument();
    expect(within(box).queryByLabelText('Add a tag')).not.toBeInTheDocument();
    // Taking one off makes room again.
    await user.click(within(box).getByRole('button', { name: 'Remove tag tag 01' }));
    expect(await within(box).findByLabelText('Add a tag')).toBeInTheDocument();
  });
});

describe('the suggestion list', () => {
  it('says when the person has no tags yet', async () => {
    const stand = {
      ...setup(),
    };
    stand.book.tags.length = 0;
    const user = userEvent.setup();
    renderPage(stand);

    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    expect(await within(box).findByText(/no tags yet/)).toBeInTheDocument();
  });

  it('still lets a name be typed when the list cannot be loaded, and can try again', async () => {
    const stand = setup();
    const user = userEvent.setup();
    stand.tags.failNext('list', apiError(500));
    renderPage(stand);

    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    expect(await within(box).findByText(/could not be loaded/)).toBeInTheDocument();
    expect(within(box).getByLabelText('Add a tag')).toBeEnabled();

    await user.click(within(box).getByRole('button', { name: 'Try again' }));
    expect(await within(box).findByRole('button', { name: 'Add tag trip' })).toBeInTheDocument();
  });

  it('closes with Done', async () => {
    const user = userEvent.setup();
    renderPage(setup());
    const box = await openDay(user, 'Add tags, Stretch, Wed 7 Oct');

    await user.click(within(box).getByRole('button', { name: 'Done' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('managing the tags', () => {
  async function openManager(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Manage tags' }));
    return dialog('Manage tags');
  }

  it('lists every tag with where it is used', async () => {
    const user = userEvent.setup();
    renderPage(setup());

    const box = await openManager(user);

    expect(await within(box).findByText('Used on 2 days, last on 6 Oct 2026')).toBeInTheDocument();
    expect(within(box).getByText('Used on 1 day, last on 2 Oct 2026')).toBeInTheDocument();
    expect(within(box).getByText('Not used yet')).toBeInTheDocument();
  });

  it('renames a tag everywhere and the grid shows the new name', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    await dot('Tags, Stretch, Mon 5 Oct: sick');
    const box = await openManager(user);

    await user.click(await within(box).findByRole('button', { name: 'Rename sick' }));
    const field = within(box).getByLabelText('New name for sick');
    await user.clear(field);
    await user.type(field, 'ill{Enter}');

    await waitFor(() => expect(stand.tags.calls.rename).toEqual([{ id: 't-sick', name: 'ill' }]));
    expect(await within(box).findByText('ill')).toBeInTheDocument();
    expect(await dot('Tags, Stretch, Mon 5 Oct: ill')).toBeInTheDocument();
  });

  it('warns that a name another tag has merges, and merges', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    await dot('Tags, Stretch, Mon 5 Oct: sick');
    const box = await openManager(user);

    await user.click(await within(box).findByRole('button', { name: 'Rename sick' }));
    const field = within(box).getByLabelText('New name for sick');
    await user.clear(field);
    await user.type(field, 'FLU');

    expect(within(box).getByText(/“flu” exists already/)).toBeInTheDocument();
    await user.click(within(box).getByRole('button', { name: 'Merge' }));

    expect(await screen.findByText('“sick” is merged into “flu”.')).toBeInTheDocument();
    expect(await dot('Tags, Stretch, Mon 5 Oct: flu')).toBeInTheDocument();
    expect(within(box).queryByRole('button', { name: 'Rename sick' })).not.toBeInTheDocument();
  });

  it('says on how many days a delete takes effect, before and after', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    await dot('Tags, Stretch, Mon 5 Oct: sick');
    const box = await openManager(user);

    await user.click(await within(box).findByRole('button', { name: 'Delete sick' }));
    expect(within(box).getByText(/It will be taken off 2 days\./)).toBeInTheDocument();
    await user.click(within(box).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('“sick” deleted and taken off 2 days.')).toBeInTheDocument();
    expect(await dot('Add tags, Stretch, Mon 5 Oct')).toBeInTheDocument();
    expect(stand.tags.calls.remove).toEqual(['t-sick']);
  });

  it('keeps the tag when the delete is cancelled', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openManager(user);

    await user.click(await within(box).findByRole('button', { name: 'Delete sick' }));
    await user.click(within(box).getByRole('button', { name: 'Cancel' }));

    expect(within(box).getByRole('button', { name: 'Delete sick' })).toBeInTheDocument();
    expect(stand.tags.calls.remove).toEqual([]);
  });

  it('shows a refused rename next to the row and keeps the typed name', async () => {
    const stand = setup();
    const user = userEvent.setup();
    renderPage(stand);
    const box = await openManager(user);
    stand.tags.failNext('rename', apiError(400, { detail: 'That name is not allowed.' }));

    await user.click(await within(box).findByRole('button', { name: 'Rename sick' }));
    await user.type(within(box).getByLabelText('New name for sick'), 'x{Enter}');

    expect(await within(box).findByRole('alert')).toHaveTextContent('not allowed');
    expect(within(box).getByLabelText('New name for sick')).toHaveValue('sickx');
  });

  it('invites to the first tag when there are none', async () => {
    const stand = setup();
    stand.book.tags.length = 0;
    const user = userEvent.setup();
    renderPage(stand);

    const box = await openManager(user);

    expect(await within(box).findByText(/You have no tags yet/)).toBeInTheDocument();
  });
});
