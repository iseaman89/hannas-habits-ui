import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/shared/ui';
import { GoogleSection } from './GoogleSection';

function renderSection(clientId: string | null) {
  return render(
    <ThemeProvider>
      <GoogleSection
        clientId={clientId}
        onCredential={() => undefined}
        onFailure={() => undefined}
      />
    </ThemeProvider>,
  );
}

describe('GoogleSection', () => {
  it('leaves Google out when no client id is configured: the email login stands alone', () => {
    const { container } = renderSection(null);

    expect(container).toBeEmptyDOMElement();
  });

  it('treats an empty client id like none', () => {
    const { container } = renderSection('');

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the divider and makes room for Google’s button when a client id is configured', () => {
    renderSection('1234.apps.googleusercontent.com');

    // The divider is decoration (hidden from screen readers); Google's script draws the button.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.body).toHaveTextContent('or');
  });
});
