import { render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { brand } from './brand';
import { documentTitle, useDocumentTitle } from './documentTitle';

function Screen({ title }: { title: string | null }) {
  useDocumentTitle(title);
  return null;
}

afterEach(() => {
  document.title = '';
  localStorage.clear();
});

describe('documentTitle', () => {
  it('puts the app name after the title', () => {
    expect(documentTitle('October 2026 · Habits')).toBe("October 2026 · Habits · Hanna's Habits");
  });

  it.each([null, ''])('is the app name alone for %j', (title) => {
    expect(documentTitle(title)).toBe("Hanna's Habits");
  });
});

describe('useDocumentTitle', () => {
  it('sets the title, follows a change and puts the app name back when the screen goes', () => {
    const { rerender, unmount } = render(<Screen title="Habits" />);
    expect(document.title).toBe("Habits · Hanna's Habits");

    rerender(<Screen title="Calendar" />);
    expect(document.title).toBe("Calendar · Hanna's Habits");

    unmount();
    expect(document.title).toBe("Hanna's Habits");
  });

  it('names the service after whoever signed in on this browser, now and later', () => {
    render(<Screen title="Habits" />);
    expect(document.title).toBe("Habits · Hanna's Habits");

    act(() => brand.remember('Yevgen'));

    expect(document.title).toBe("Habits · Yevgen's Habits");
    expect(documentTitle(null)).toBe("Yevgen's Habits");
  });
});
