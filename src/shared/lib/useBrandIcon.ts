import { useEffect } from 'react';
import { brandIconUrl } from './brandIcon';
import { useBrandName } from './useBrand';

/**
 * Keeps the tab's icon in step with the name the service carries. `index.html` has a static
 * icon (the tick) for the first moments and for everything that does not run the page's script.
 */
export function useBrandIcon(): void {
  const name = useBrandName();

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.append(link);
    }
    link.type = 'image/svg+xml';
    link.href = brandIconUrl(name);
  }, [name]);
}
