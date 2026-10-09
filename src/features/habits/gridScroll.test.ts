import { describe, expect, it } from 'vitest';
import { scrollLeftToCenter } from './gridScroll';

describe('scrollLeftToCenter', () => {
  const names = { namesWidth: 128, boxWidth: 328 }; // 200 px of room beside the names

  it('puts the column in the middle of the free room', () => {
    // Column 10 of 36 px each, after the 128 px names: left = 128 + 9 * 36 = 452.
    const scrolled = scrollLeftToCenter({ columnLeft: 452, columnWidth: 36, ...names });

    // Seen at 452 - scrolled = 128 + (200 - 36) / 2 = 210: its centre is 228, the room's is 228.
    expect(452 - scrolled).toBe(210);
  });

  it('stays at the start when the column is already near it', () => {
    expect(scrollLeftToCenter({ columnLeft: 128, columnWidth: 36, ...names })).toBe(0);
    expect(scrollLeftToCenter({ columnLeft: 164, columnWidth: 36, ...names })).toBe(0);
  });

  it('does not scroll when everything fits', () => {
    expect(
      scrollLeftToCenter({ columnLeft: 700, columnWidth: 36, namesWidth: 256, boxWidth: 1400 }),
    ).toBe(0);
  });
});
