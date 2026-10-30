// hooks/useFetchJson.ts   (React 19.2+) — B4 (transcribed verbatim from the master plan)
import { useEffect, useEffectEvent, useState } from 'react';

export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

type Settled<T> =
  | { url: string; status: 'success'; data: T }
  | { url: string; status: 'error'; error: Error };

export function useFetchJson<T>(
  url: string | null,
  parse: (json: unknown) => T,
): FetchState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const parseLatest = useEffectEvent(parse); // always the latest parser, never a dependency

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return res.json() as Promise<unknown>;
      })
      .then((json) => {
        // The response can land in the same instant the cleanup aborts
        // (e.g. res.json() still parsing during a URL change). Without
        // this guard the stale success overwrites the newer settled
        // state and the hook sticks on 'loading' for the current URL.
        if (controller.signal.aborted) return;
        setSettled({ url, status: 'success', data: parseLatest(json) });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return; // we cancelled it — not an error
        setSettled({
          url,
          status: 'error',
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => controller.abort();
  }, [url]);

  // Derived state — no extra renders, no "loading" flicker bugs
  if (url === null) return { status: 'idle' };
  if (settled === null || settled.url !== url) return { status: 'loading' };
  // Return exactly the public FetchState shape — `settled` also carries the
  // internal `url` bookkeeping field, which must not leak to callers.
  return settled.status === 'success'
    ? { status: 'success', data: settled.data }
    : { status: 'error', error: settled.error };
}
