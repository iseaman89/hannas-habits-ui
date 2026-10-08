import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DIARY_LIMITS, newRowId, type DraftTask } from './diaryDraft';
import { TaskList } from './TaskList';

const task = (title: string, done = false): DraftTask => ({ id: newRowId(), title, done });

function Harness({ initial = [] }: { initial?: DraftTask[] }) {
  const [tasks, setTasks] = useState(initial);
  return (
    <>
      <TaskList tasks={tasks} onChange={setTasks} />
      <p data-testid="state">{JSON.stringify(tasks.map(({ title, done }) => [title, done]))}</p>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId('state').textContent) as [string, boolean][];

describe('TaskList', () => {
  it('lists the tasks with a checkbox each and counts the finished ones', () => {
    render(<Harness initial={[task('Call mum', true), task('Tax'), task('Run', true)]} />);

    expect(screen.getByRole('list', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Done: Call mum' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Done: Tax' })).not.toBeChecked();
    expect(screen.getByText('2 done')).toBeInTheDocument();
  });

  it('ticks a task and updates the count', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[task('Tax')]} />);

    await user.click(screen.getByRole('checkbox', { name: 'Done: Tax' }));

    expect(state()).toEqual([['Tax', true]]);
    expect(screen.getByText('1 done')).toBeInTheDocument();
  });

  it('crosses a finished task out and not an open one', () => {
    render(<Harness initial={[task('Call mum', true), task('Tax')]} />);

    expect(screen.getByRole('textbox', { name: 'Task 1' })).toHaveClass('line-through');
    expect(screen.getByRole('textbox', { name: 'Task 2' })).not.toHaveClass('line-through');
  });

  it('adds an open task on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[task('Tax')]} />);

    await user.type(screen.getByRole('textbox', { name: 'Add a task' }), 'Call mum{Enter}');

    expect(state()).toEqual([
      ['Tax', false],
      ['Call mum', false],
    ]);
  });

  it('renames a task in place without touching its tick', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[task('Cal mum', true)]} />);
    const input = screen.getByRole('textbox', { name: 'Task 1' });

    await user.clear(input);
    await user.type(input, 'Call mum');

    expect(state()).toEqual([['Call mum', true]]);
  });

  it('removes a task, and one that was emptied when the person leaves it', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[task('Tax'), task('Run'), task('Read')]} />);

    await user.click(screen.getByRole('button', { name: 'Remove Task 2' }));
    expect(state()).toEqual([
      ['Tax', false],
      ['Read', false],
    ]);

    await user.clear(screen.getByRole('textbox', { name: 'Task 1' }));
    await user.tab();
    expect(state()).toEqual([['Read', false]]);
  });

  it('offers no add row once the day holds the most the server accepts', () => {
    const full = Array.from({ length: DIARY_LIMITS.tasks }, (_, i) => task(`Task ${i}`));
    render(<Harness initial={full} />);

    expect(screen.queryByRole('textbox', { name: 'Add a task' })).toBeNull();
  });
});
