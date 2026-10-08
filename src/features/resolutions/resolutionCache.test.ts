import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { applyKept, withKept } from './resolutionCache';
import { resolutionKeys } from './resolutionQueries';
import type { Resolution } from './resolutionsGateway';

const item = (id: string, kept = false): Resolution => ({
  id,
  title: `Title ${id}`,
  kept,
  habitId: null,
  habitTitle: null,
});

describe('withKept', () => {
  it('changes one item and leaves the order and the others alone', () => {
    const list = [item('a'), item('b'), item('c', true)];

    const changed = withKept(list, 'b', true);

    expect(changed.map((r) => [r.id, r.kept])).toEqual([
      ['a', false],
      ['b', true],
      ['c', true],
    ]);
    expect(changed[0]).toBe(list[0]); // untouched items are the same objects
    expect(list[1]?.kept).toBe(false); // the input is not mutated
  });

  it('can take it back', () => {
    expect(withKept([item('a', true)], 'a', false)[0]?.kept).toBe(false);
  });

  it('keeps title and habit link as they were', () => {
    const linked = { ...item('a'), habitId: 'h-1', habitTitle: 'Read' };

    expect(withKept([linked], 'a', true)[0]).toEqual({ ...linked, kept: true });
  });

  it('ignores an id that is not in the list', () => {
    expect(withKept([item('a')], 'zzz', true)).toEqual([item('a')]);
  });
});

describe('applyKept', () => {
  it('writes into the loaded list of that year only', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(resolutionKeys.year(2026), [item('a')]);
    queryClient.setQueryData(resolutionKeys.year(2025), [item('a')]);

    applyKept(queryClient, 2026, 'a', true);

    expect(queryClient.getQueryData<Resolution[]>(resolutionKeys.year(2026))?.[0]?.kept).toBe(true);
    expect(queryClient.getQueryData<Resolution[]>(resolutionKeys.year(2025))?.[0]?.kept).toBe(
      false,
    );
  });

  it('leaves a year that was never loaded alone', () => {
    const queryClient = new QueryClient();

    applyKept(queryClient, 2026, 'a', true);

    expect(queryClient.getQueryData(resolutionKeys.year(2026))).toBeUndefined();
  });
});
