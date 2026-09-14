import { useCallback, useEffect, useRef, useState } from "react";

// Membership is only held briefly; the visual "fade-out ~1.5s" comes from the
// CSS transition on the consuming component (background-color 1.5s ease-out)
// animating FROM the highlight color back to normal once membership drops.
const FLASH_WINDOW_MS = 60;

export function useFadingHighlights() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const trigger = useCallback((id: string) => {
    setIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

    const existing = timers.current.get(id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      setIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, FLASH_WINDOW_MS);

    timers.current.set(id, timer);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  return { highlighted: ids, trigger };
}
