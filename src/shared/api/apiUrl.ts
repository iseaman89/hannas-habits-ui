/**
 * What is wrong with the configured API address (`VITE_API_URL`), or `null` when it is usable.
 * Pure and free of side effects, so the start-up check can ask it before anything that needs
 * the address is loaded.
 *
 * A path such as `/api` is fine: that is the app and the API behind one reverse proxy.
 */
export function apiUrlProblem(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url) {
    return 'VITE_API_URL is not set. It is the address of the backend including /api, e.g. https://localhost:7054/api.';
  }
  if (url.startsWith('/') && !url.startsWith('//')) return null;
  try {
    const { protocol } = new URL(url);
    if (protocol === 'http:' || protocol === 'https:') return null;
  } catch {
    // Not a URL at all: reported below.
  }
  return `VITE_API_URL is not a web address (“${url}”). Use e.g. https://localhost:7054/api, or a path such as /api when the API sits behind the same server.`;
}
