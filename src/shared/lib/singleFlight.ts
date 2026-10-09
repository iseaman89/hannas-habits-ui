/**
 * Wraps an async function so that calls made while a run is still in progress share that run
 * (its result or its error) instead of starting another one. Once the run has settled, the next
 * call starts a fresh run.
 *
 * Used for the token refresh: a refresh token works exactly once, so five requests that all
 * get a 401 at the same moment must trigger one refresh, not five.
 */
export function singleFlight<T>(run: () => Promise<T>): () => Promise<T> {
  let inFlight: Promise<T> | null = null;

  return () => {
    inFlight ??= run().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
}
