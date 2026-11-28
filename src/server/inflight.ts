/** Caps how many expensive requests one user can have running at once on this instance (per-instance by nature). */
const running = new Map<string, number>();

/** Returns a release function, or null when the user already has `max` requests in flight. */
export function acquire(key: string, max: number): (() => void) | null {
  const n = running.get(key) ?? 0;
  if (n >= max) return null;
  running.set(key, n + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const left = (running.get(key) ?? 1) - 1;
    if (left <= 0) running.delete(key);
    else running.set(key, left);
  };
}
