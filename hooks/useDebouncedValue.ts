// hooks/useDebouncedValue.ts — B3 (transcribed verbatim from the master plan)
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id); // ← cancels the stale timer on every change
  }, [value, delayMs]);

  return debounced;
}
