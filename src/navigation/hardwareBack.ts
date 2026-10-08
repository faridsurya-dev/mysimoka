import { useEffect, useRef } from 'react';

/**
 * Android hardware back, routed through one BackHandler listener owned by
 * RootNavigator. Screens with their own inner steps register a handler here;
 * the most recently registered one runs first and returns true when it
 * consumed the press. A plain BackHandler listener would not work for screens:
 * child effects run before the navigator's, so the navigator would win.
 */
type BackHandlerFn = () => boolean;

const handlers: Array<{ current: BackHandlerFn }> = [];

export function runScreenBackHandlers(): boolean {
  for (let index = handlers.length - 1; index >= 0; index -= 1) {
    if (handlers[index].current()) {
      return true;
    }
  }
  return false;
}

export function useHardwareBack(handler: BackHandlerFn, enabled = true) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const entry = { current: () => handlerRef.current() };
    handlers.push(entry);
    return () => {
      const index = handlers.indexOf(entry);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  }, [enabled]);
}
