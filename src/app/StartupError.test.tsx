import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StartupError } from './StartupError';

describe('StartupError', () => {
  it('names what is wrong and what to do, as an alert', () => {
    render(
      <StartupError
        title="The app is not set up"
        problems={['VITE_API_URL is not set.', 'Another thing is missing.']}
        hint="Copy .env.example to .env."
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'The app is not set up' })).toBeVisible();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('VITE_API_URL is not set.');
    expect(alert).toHaveTextContent('Another thing is missing.');
    expect(alert).toHaveTextContent('Copy .env.example to .env.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
