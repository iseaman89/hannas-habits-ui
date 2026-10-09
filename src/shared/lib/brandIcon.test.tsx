import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { brand } from './brand';
import { brandIconSvg, brandIconUrl } from './brandIcon';
import { useBrandIcon } from './useBrandIcon';

describe('brandIconSvg', () => {
  it('is a circle with the initial of the name', () => {
    const svg = brandIconSvg('Yevgen');

    expect(svg).toContain('<circle');
    expect(svg).toMatch(/<text[^>]*>Y<\/text>/);
    expect(svg).not.toContain('<path');
  });

  it('shows one letter for Hanna’s Habits, never "HH"', () => {
    expect(brandIconSvg('Hanna')).toMatch(/<text[^>]*>H<\/text>/);
    expect(brandIconSvg('Hanna')).not.toContain('HH');
  });

  it('falls back to the tick for a name without a letter', () => {
    const svg = brandIconSvg('1234');

    expect(svg).toContain('<path');
    expect(svg).not.toContain('<text');
  });
});

describe('brandIconUrl', () => {
  it('is an SVG data URL that decodes to the icon', () => {
    const url = brandIconUrl('Anna');

    expect(url.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(url.slice('data:image/svg+xml,'.length))).toBe(brandIconSvg('Anna'));
  });
});

function Probe() {
  useBrandIcon();
  return null;
}

describe('useBrandIcon', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />';
  });

  afterEach(() => {
    localStorage.clear();
    document.head.innerHTML = '';
  });

  const href = () => document.querySelector<HTMLLinkElement>('link[rel~="icon"]')?.href ?? '';

  it('replaces the static icon with the initial of the name, and follows a new name', () => {
    render(<Probe />);
    expect(decodeURIComponent(href())).toContain('>H</text>');

    act(() => brand.remember('Yevgen'));

    expect(decodeURIComponent(href())).toContain('>Y</text>');
  });

  it('adds an icon link when the page has none', () => {
    document.head.innerHTML = '';

    render(<Probe />);

    expect(document.querySelectorAll('link[rel~="icon"]')).toHaveLength(1);
    expect(href()).toContain('data:image/svg+xml');
  });
});
