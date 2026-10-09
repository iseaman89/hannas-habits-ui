import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('shows the first letter of the name, and only that', () => {
    const { container } = render(<BrandMark firstName="Hanna" />);

    expect(container).toHaveTextContent(/^H$/);
  });

  it('is decoration for a screen reader', () => {
    const { container } = render(<BrandMark firstName="Yevgen" />);

    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows the tick for a name without a letter', () => {
    const { container } = render(<BrandMark firstName="123" />);

    expect(container).toHaveTextContent('');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
