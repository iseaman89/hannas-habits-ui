import { useLayoutEffect, useRef, useState } from 'react';

/**
 * The current width of an element in px, kept up to date while it resizes: `[ref, width]`.
 * `width` is `null` until the first measurement - and for good where there is no
 * `ResizeObserver` - so the caller always needs a sensible default.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const measure = () => setWidth(Math.floor(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
