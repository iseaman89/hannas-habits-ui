import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HoverCard } from './HoverCard';

function renderCard(card: ReactNode = <p>The note</p>) {
  render(
    <>
      <HoverCard label="Note, Legs" card={card}>
        <button type="button">Cell</button>
      </HoverCard>
      <button type="button">After</button>
    </>,
  );
}

const cardOrNull = () => screen.queryByRole('group', { name: 'Note, Legs' });
const findCard = () => screen.findByRole('group', { name: 'Note, Legs' });
/** Longer than the card's open delay and its close delay. */
const pause = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HoverCard', () => {
  it('opens when the mouse rests on the trigger, not the moment it arrives', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    expect(cardOrNull()).not.toBeInTheDocument();

    expect(await findCard()).toHaveTextContent('The note');
  });

  it('does not open for a mouse that only passes over', async () => {
    const user = userEvent.setup();
    renderCard();

    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    await user.unhover(screen.getByRole('button', { name: 'Cell' }));
    await pause();

    expect(cardOrNull()).not.toBeInTheDocument();
  });

  it('closes a moment after the mouse left', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    await findCard();

    await user.unhover(screen.getByRole('button', { name: 'Cell' }));

    await vi.waitFor(() => expect(cardOrNull()).not.toBeInTheDocument());
  });

  it('stays open while the mouse is on the card itself', async () => {
    const user = userEvent.setup();
    renderCard();
    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    const card = await findCard();

    await user.unhover(screen.getByRole('button', { name: 'Cell' }));
    await user.hover(card);
    await pause();

    expect(cardOrNull()).toBeInTheDocument();
  });

  it('has no card, and shows no trace of one, without content', async () => {
    const user = userEvent.setup();
    renderCard(null);

    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    await pause();

    expect(screen.getByRole('button', { name: 'Cell' })).toBeInTheDocument();
    expect(cardOrNull()).not.toBeInTheDocument();
  });

  it('never opens for a touch: it has no hover', async () => {
    renderCard();

    fireEvent.pointerOver(screen.getByRole('button', { name: 'Cell' }), { pointerType: 'touch' });
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Cell' }), { pointerType: 'touch' });
    await pause();

    expect(cardOrNull()).not.toBeInTheDocument();
  });

  describe('with the keyboard', () => {
    it('opens when the trigger is reached with Tab, and the field in the card is next', async () => {
      const user = userEvent.setup();
      renderCard(<textarea aria-label="Note" />);

      await user.tab();

      expect(screen.getByRole('button', { name: 'Cell' })).toHaveFocus();
      expect(cardOrNull()).toBeInTheDocument();

      await user.tab();
      expect(screen.getByRole('textbox', { name: 'Note' })).toHaveFocus();
      expect(cardOrNull()).toBeInTheDocument();
    });

    it('closes when the focus leaves the card', async () => {
      const user = userEvent.setup();
      renderCard(<textarea aria-label="Note" />);
      await user.tab();
      await user.tab();

      await user.tab(); // out of the card, to the button after it

      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
      await vi.waitFor(() => expect(cardOrNull()).not.toBeInTheDocument());
    });

    it('closes with Escape and gives the focus back to the trigger without reopening', async () => {
      const user = userEvent.setup();
      renderCard(<textarea aria-label="Note" />);
      await user.tab();
      await user.tab();

      await user.keyboard('{Escape}');

      expect(cardOrNull()).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cell' })).toHaveFocus();
      await pause();
      expect(cardOrNull()).not.toBeInTheDocument();
    });
  });

  it('does not open for the focus a mouse click gives the trigger, only for the keyboard’s', async () => {
    renderCard();
    const trigger = screen.getByRole('button', { name: 'Cell' });

    // A press, the focus it causes, the release - and no hover (a touch pen, a test).
    fireEvent.pointerDown(trigger);
    trigger.focus();
    fireEvent.pointerUp(trigger);
    await pause();

    expect(cardOrNull()).not.toBeInTheDocument();
  });

  it('stays open while its field has the focus, wherever the mouse is', async () => {
    const user = userEvent.setup();
    renderCard(<textarea aria-label="Note" />);
    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    await user.click(await screen.findByRole('textbox', { name: 'Note' }));

    await user.unhover(screen.getByRole('textbox', { name: 'Note' }));
    await pause();

    expect(cardOrNull()).toBeInTheDocument();
  });

  it('closes when the page scrolls, but not when the card’s own field does', async () => {
    const user = userEvent.setup();
    renderCard(<textarea aria-label="Note" />);
    await user.hover(screen.getByRole('button', { name: 'Cell' }));
    const field = await screen.findByRole('textbox', { name: 'Note' });

    fireEvent.scroll(field);
    expect(cardOrNull()).toBeInTheDocument();

    fireEvent.scroll(document);
    expect(cardOrNull()).not.toBeInTheDocument();
  });

  describe('its place', () => {
    function measure(trigger: Partial<DOMRect>, card: { width: number; height: number }) {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this.getAttribute('role') === 'group') {
          return { ...card, left: 0, top: 0, right: card.width, bottom: card.height } as DOMRect;
        }
        return this.tagName === 'SPAN' ? ({ ...trigger } as DOMRect) : ({} as DOMRect);
      });
    }

    const placeOf = async () => {
      const user = userEvent.setup();
      renderCard();
      await user.hover(screen.getByRole('button', { name: 'Cell' }));
      return (await findCard()).style;
    };

    it('is centred below the trigger', async () => {
      measure(
        { left: 400, top: 100, width: 40, height: 40, bottom: 140 },
        { width: 288, height: 100 },
      );

      const style = await placeOf();

      expect(style.left).toBe('276px'); // 400 + 20 - 144
      expect(style.top).toBe('146px'); // 140 + 6
      expect(style.visibility).toBe('visible');
    });

    it('goes above the trigger when there is no room below', async () => {
      // jsdom's window is 768 px high.
      measure(
        { left: 400, top: 700, width: 40, height: 40, bottom: 740 },
        { width: 288, height: 100 },
      );

      const style = await placeOf();

      expect(style.top).toBe('594px'); // 700 - 6 - 100
    });

    it('stays inside the window at its left edge', async () => {
      measure(
        { left: 0, top: 100, width: 40, height: 40, bottom: 140 },
        { width: 288, height: 100 },
      );

      const style = await placeOf();

      expect(style.left).toBe('8px');
    });
  });
});
