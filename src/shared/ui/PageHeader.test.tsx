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

  it('names the screen in the browser tab, and puts the app name back when it goes', () => {
    const { unmount } = render(<PageHeader kicker="Habits" title="October 2026" />);
    expect(document.title).toBe("October 2026 · Habits · Hanna's Habits");

    unmount();
    expect(document.title).toBe("Hanna's Habits");
  });

  it('takes a number as a title too (the calendar shows just the year)', () => {
    render(<PageHeader kicker="Calendar" title={2026} />);

    expect(document.title).toBe("2026 · Calendar · Hanna's Habits");
  });

  it('leaves the tab alone when the title is not plain text', () => {
    document.title = 'before';
    render(<PageHeader kicker="Habits" title={<em>October</em>} />);

    expect(document.title).toBe("Hanna's Habits");
  });
});
