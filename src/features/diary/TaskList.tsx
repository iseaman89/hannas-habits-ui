import { useId } from 'react';
import { Card, Checkbox } from '@/shared/ui';
import { AddItemInput } from './AddItemInput';
import { DIARY_LIMITS, newRowId, type DraftTask } from './diaryDraft';
import { EditableLine } from './EditableLine';

interface TaskListProps {
  tasks: readonly DraftTask[];
  onChange: (tasks: DraftTask[]) => void;
}

/** The day's checklist: tick, rename or remove a task in place, add one at the end. */
export function TaskList({ tasks, onChange }: TaskListProps) {
  const headingId = useId();
  const done = tasks.filter((task) => task.done).length;
  const full = tasks.length >= DIARY_LIMITS.tasks;

  const change = (id: string, patch: Partial<DraftTask>) =>
    onChange(tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)));

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={headingId} className="font-display text-card">
          Tasks
        </h2>
        <p className="text-sm font-bold text-accent-700">{done} done</p>
      </div>

      <ul aria-labelledby={headingId} className="mt-3 flex flex-col gap-0.5">
        {tasks.map((task, index) => (
          <EditableLine
            key={task.id}
            marker={
              <Checkbox
                label={`Done: ${task.title.trim() || `task ${index + 1}`}`}
                checked={task.done}
                onChange={(checked) => change(task.id, { done: checked })}
              />
            }
            label={`Task ${index + 1}`}
            value={task.title}
            maxLength={DIARY_LIMITS.taskTitle}
            struck={task.done}
            onChange={(title) => change(task.id, { title })}
            onRemove={() => onChange(tasks.filter((other) => other.id !== task.id))}
          />
        ))}
      </ul>

      <div className="mt-1">
        {full ? (
          <p className="text-sm text-neutral-700">
            That is the most a day holds ({DIARY_LIMITS.tasks}).
          </p>
        ) : (
          <AddItemInput
            label="Add a task"
            placeholder="Add task and press Enter"
            maxLength={DIARY_LIMITS.taskTitle}
            onAdd={(title) => onChange([...tasks, { id: newRowId(), title, done: false }])}
          />
        )}
      </div>
    </Card>
  );
}
