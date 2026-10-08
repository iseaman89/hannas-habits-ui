import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('has the title as the page heading and shows kicker, status and actions', () => {
    render(
      <PageHeader
        kicker="Habits"
        title="October 2026"
        status={<span>Saved</span>}
        actions={<button>New habit</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'October 2026' })).toBeInTheDocument();
    expect(screen.getByText('Habits')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New habit' })).toBeInTheDocument();
  });
});
