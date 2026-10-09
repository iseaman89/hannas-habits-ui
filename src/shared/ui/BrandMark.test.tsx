import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandMark } from './BrandMark';

describe('BrandMark', () => {
  it('is the one logo of the tab icon, the same for everybody', () => {
    const { container } = render(<BrandMark className="size-11" />);

    const logo = container.querySelector('img');
    expect(logo).toHaveAttribute('src', '/favicon.svg');
    expect(logo).toHaveClass('size-11');
  });

  it('is decoration for a screen reader', () => {
    const { container } = render(<BrandMark />);

    expect(container.querySelector('img')).toHaveAttribute('alt', '');
    expect(container.querySelector('img')).toHaveAttribute('aria-hidden', 'true');
  });
});
