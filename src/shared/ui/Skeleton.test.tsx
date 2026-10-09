import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton, SkeletonGroup } from './Skeleton';

describe('Skeleton', () => {
  it('announces the group once, in words, and hides the blocks from screen readers', () => {
    const { container } = render(
      <SkeletonGroup label="Loading habits">
        <Skeleton />
        <Skeleton />
      </SkeletonGroup>,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading habits');
    expect(status).toHaveAttribute('aria-busy', 'true');
    const blocks = container.querySelectorAll('[aria-hidden="true"]');
    expect(blocks).toHaveLength(2);
  });
});
