import { addDays, endOfMonth, getISODay, startOfMonth } from 'date-fns';

/**
 * A month as the rows of its table: Monday first, seven cells a row, `null` for the cells before
 * the 1st and after the last day (so every row is full). Days are local midnight.
 */
export function weeksOfMonth(month: Date): (Date | null)[][] {
  const first = startOfMonth(month);
  const cells: (Date | null)[] = [
    // getISODay: Monday = 1 ... Sunday = 7, so a month starting on a Monday has no gap.
    ...Array.from({ length: getISODay(first) - 1 }, () => null),
    ...Array.from({ length: endOfMonth(month).getDate() }, (_, index) => addDays(first, index)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7));
  return weeks;
}
