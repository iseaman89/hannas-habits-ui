interface Measures {
  /** Where the day's column begins inside the table (`offsetLeft`). */
  columnLeft: number;
  columnWidth: number;
  /** The habit names' column: it stays in view, so the days are only seen beside it. */
  namesWidth: number;
  /** The width of the scrolling box. */
  boxWidth: number;
}

/**
 * How far the table has to scroll sideways so that one day's column sits in the middle of the
 * room the names leave free. On a phone only five or six days fit beside the names, and a month
 * that opens at the 1st would hide today.
 */
export function scrollLeftToCenter({ columnLeft, columnWidth, namesWidth, boxWidth }: Measures) {
  const room = boxWidth - namesWidth;
  return Math.max(0, columnLeft - namesWidth - (room - columnWidth) / 2);
}
