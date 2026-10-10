import { Repeat } from 'lucide-react';
import { Field, Input, Select } from '@/shared/ui';
import {
  ordinal,
  recurrenceSummary,
  type ScheduleKind,
  type WeekdayOccurrence,
} from './recurrence';
import {
  ANCHOR_MAX,
  ANCHOR_MIN,
  MAX_DAY_INTERVAL,
  MAX_DAY_OF_MONTH,
  MAX_WEEK_INTERVAL,
  MIN_DAY_INTERVAL,
  OCCURRENCES,
  SCHEDULE_KINDS,
  type RecurrenceValues,
} from './recurrenceSchema';
import { MONDAY_FIRST, dayName, type DayOfWeek } from './weekdays';
import { WeekdayToggle } from './WeekdayToggle';

/** The message to show under each fact of the rule (from the form's checks or from the server). */
export type RecurrenceErrors = Partial<
  Record<
    | 'kind'
    | 'weekdays'
    | 'everyWeeks'
    | 'everyDays'
    | 'anchor'
    | 'occurrence'
    | 'weekday'
    | 'dayOfMonth',
    string
  >
>;

interface RecurrencePickerProps {
  value: RecurrenceValues;
  onChange: (next: RecurrenceValues) => void;
  /** The habit's start day (`yyyy-MM-dd`): where a rhythm counts from until it has a day of its own. */
  startDate: string;
  errors?: RecurrenceErrors;
  /** The rule is in order: say it in words. */
  summarize?: boolean;
}

const KIND_LABELS: Record<ScheduleKind, string> = {
  weekly: 'On days of the week',
  everyNDays: 'Every few days',
  monthlyOnWeekday: 'A weekday of the month',
  monthlyOnDate: 'A date of the month',
};

const OCCURRENCE_LABELS: Record<WeekdayOccurrence, string> = {
  first: 'First',
  second: 'Second',
  third: 'Third',
  fourth: 'Fourth',
  last: 'Last',
};

/** A number field's text as the model has it: `null` while it is empty or not a number. */
function toNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const number = Number(text);
  return Number.isNaN(number) ? null : number;
}

function isKind(text: string): text is ScheduleKind {
  return SCHEDULE_KINDS.some((kind) => kind === text);
}

function isOccurrence(text: string): text is WeekdayOccurrence {
  return OCCURRENCES.some((occurrence) => occurrence === text);
}

/**
 * "Repeat": which days a habit is due (DESIGN.md §4.3, the rules of B13). One choice of kind and,
 * under it, only what that kind needs; the facts of the kinds that are not chosen stay in the
 * value, so switching back and forth does not lose them. It is controlled and knows nothing of
 * forms or servers: the form hands in the messages.
 *
 * What the rule means is decided on the server (`scheduledDates` of the overview); this only
 * collects the facts and says them back in plain words.
 */
export function RecurrencePicker({
  value,
  onChange,
  startDate,
  errors = {},
  summarize = true,
}: RecurrencePickerProps) {
  const set = (patch: Partial<RecurrenceValues>) => onChange({ ...value, ...patch });

  const countsFromADay =
    (value.kind === 'weekly' && (value.everyWeeks ?? 1) > 1) || value.kind === 'everyNDays';

  return (
    <div className="flex flex-col gap-4">
      <Field label="Repeat" error={errors.kind}>
        {(control) => (
          <Select
            {...control}
            value={value.kind}
            onChange={(event) => {
              if (isKind(event.target.value)) set({ kind: event.target.value });
            }}
          >
            {SCHEDULE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {value.kind === 'weekly' && (
        <>
          <WeekdayToggle
            value={value.weekdays}
            onChange={(weekdays) => set({ weekdays })}
            error={errors.weekdays}
          />
          <Field
            label="Every how many weeks?"
            hint="1 means every week, 2 every other week."
            error={errors.everyWeeks}
          >
            {(control) => (
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_WEEK_INTERVAL}
                step={1}
                className="w-32"
                {...control}
                value={value.everyWeeks ?? ''}
                onChange={(event) => set({ everyWeeks: toNumber(event.target.value) })}
              />
            )}
          </Field>
        </>
      )}

      {value.kind === 'everyNDays' && (
        <Field
          label="Every how many days?"
          hint="2 means every other day, 3 every third day."
          error={errors.everyDays}
        >
          {(control) => (
            <Input
              type="number"
              inputMode="numeric"
              min={MIN_DAY_INTERVAL}
              max={MAX_DAY_INTERVAL}
              step={1}
              className="w-32"
              {...control}
              value={value.everyDays ?? ''}
              onChange={(event) => set({ everyDays: toNumber(event.target.value) })}
            />
          )}
        </Field>
      )}

      {value.kind === 'monthlyOnWeekday' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Which one?" error={errors.occurrence}>
            {(control) => (
              <Select
                {...control}
                value={value.occurrence}
                onChange={(event) => {
                  if (isOccurrence(event.target.value)) set({ occurrence: event.target.value });
                }}
              >
                {OCCURRENCES.map((occurrence) => (
                  <option key={occurrence} value={occurrence}>
                    {OCCURRENCE_LABELS[occurrence]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Weekday" error={errors.weekday}>
            {(control) => (
              <Select
                {...control}
                value={value.weekday}
                onChange={(event) => set({ weekday: Number(event.target.value) as DayOfWeek })}
              >
                {MONDAY_FIRST.map((day) => (
                  <option key={day} value={day}>
                    {dayName(day).long}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}

      {value.kind === 'monthlyOnDate' && (
        <Field
          label="Day of the month"
          hint={
            (value.dayOfMonth ?? 0) >= 29
              ? 'A month without that day uses its last day.'
              : undefined
          }
          error={errors.dayOfMonth}
        >
          {(control) => (
            <Select
              {...control}
              value={value.dayOfMonth ?? ''}
              onChange={(event) => set({ dayOfMonth: toNumber(event.target.value) })}
            >
              {Array.from({ length: MAX_DAY_OF_MONTH }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day === MAX_DAY_OF_MONTH ? 'Last day' : ordinal(day)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      {countsFromADay && (
        <Field
          label="Counted from"
          hint={
            value.kind === 'weekly'
              ? 'The week of this day is the first one. Weeks start on Monday.'
              : 'This day is due; the rhythm goes on from there.'
          }
          error={errors.anchor}
        >
          {(control) => (
            <Input
              type="date"
              min={ANCHOR_MIN}
              max={ANCHOR_MAX}
              {...control}
              // Until a day is chosen the rhythm counts from the start date, and so does this field.
              value={value.anchor ?? startDate}
              onChange={(event) =>
                set({ anchor: event.target.value === '' ? null : event.target.value })
              }
            />
          )}
        </Field>
      )}

      {summarize && (
        <p className="flex items-start gap-2 px-3 text-sm text-neutral-700">
          <Repeat className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{recurrenceSummary(value, startDate)}</span>
        </p>
      )}
    </div>
  );
}
