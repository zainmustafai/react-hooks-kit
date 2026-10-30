// hooks/useWindowEvent.ts   (React 19.2+) — B5 (transcribed verbatim from the master plan)
import { useEffect, useEffectEvent } from 'react';

export function useWindowEvent<K extends keyof WindowEventMap>(
  type: K,
  handler: (event: WindowEventMap[K]) => void,
  { capture = false, passive }: { capture?: boolean; passive?: boolean } = {},
) {
  const onEvent = useEffectEvent(handler);

  useEffect(() => {
    const listener = (event: WindowEventMap[K]) => onEvent(event);
    // Only pass `passive` when the caller set it: writing `passive: undefined`
    // into the options object fails type-check under exactOptionalPropertyTypes.
    const options: AddEventListenerOptions = { capture };
    if (passive !== undefined) options.passive = passive;
    window.addEventListener(type, listener, options);
    return () => window.removeEventListener(type, listener, { capture });
  }, [type, capture, passive]);
}
