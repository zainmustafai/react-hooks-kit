// hooks/useLocalStorage.ts — B8 (transcribed verbatim from the master plan)
import {
  useCallback, useMemo, useState, useSyncExternalStore, type SetStateAction,
} from 'react';

const SAME_TAB_EVENT = 'zv:local-storage';

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);       // fires for OTHER tabs
  window.addEventListener(SAME_TAB_EVENT, onChange);  // we fire this for THIS tab
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SAME_TAB_EVENT, onChange);
  };
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [fallback] = useState(initialValue); // freeze the first value → stable identity

  // Snapshot is the raw STRING: strings compare by value, so no infinite re-renders
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key),
    () => null, // server: always fallback
  );

  const value = useMemo(() => safeParse(raw, fallback), [raw, fallback]);

  const setValue = useCallback(
    (next: SetStateAction<T>) => {
      const current = safeParse(window.localStorage.getItem(key), fallback);
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch (err) {
        console.warn(`useLocalStorage: could not write "${key}"`, err); // quota / private mode
        return;
      }
      window.dispatchEvent(new Event(SAME_TAB_EVENT));
    },
    [key, fallback],
  );

  const remove = useCallback(() => {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  }, [key]);

  return [value, setValue, remove] as const;
}
