import { brandInitial } from './brand';

const SAGE = '#7a8a5e'; // --color-accent-2
const CREAM = '#f5ead8'; // --color-bg (light)

/** The logo as a self-contained SVG: a sage circle with the name's initial, or the tick when there is none. */
export function brandIconSvg(firstName: string): string {
  const initial = brandInitial(firstName);
  // A letter cannot be `&`, `<` or `>`, so it needs no escaping. The font is a system one: a
  // page's web fonts are not available to an image.
  const mark = initial
    ? `<text x="32" y="45" text-anchor="middle" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" font-size="38" font-weight="700" fill="${CREAM}">${initial}</text>`
    : `<path d="M18 33l9 9 19-20" fill="none" stroke="${CREAM}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="${SAGE}"/>${mark}</svg>`;
}

/** For `<link rel="icon" href=…>`. */
export function brandIconUrl(firstName: string): string {
  return `data:image/svg+xml,${encodeURIComponent(brandIconSvg(firstName))}`;
}
