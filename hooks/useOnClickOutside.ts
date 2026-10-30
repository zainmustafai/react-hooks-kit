// hooks/useOnClickOutside.ts   (React 19.2+) — B6 (transcribed verbatim from the master plan)
import { useEffect, useEffectEvent, type RefObject } from 'react';

export function useOnClickOutside<E extends HTMLElement>(
  ref: RefObject<E | null>,
  handler: (event: PointerEvent) => void,
) {
  const onOutside = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: PointerEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      onOutside(event);
    };
    document.addEventListener('pointerdown', listener);
    return () => document.removeEventListener('pointerdown', listener);
  }, [ref]);
}
