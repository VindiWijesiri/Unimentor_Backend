type SeedFn = (userId: string) => Promise<void>;

function memoizeSeed(fn: SeedFn): SeedFn {
  const done = new Set<string>();
  const inflight = new Map<string, Promise<void>>();

  return async (userId: string) => {
    if (done.has(userId)) return;
    const pending = inflight.get(userId);
    if (pending) return pending;

    const task = fn(userId)
      .then(() => {
        done.add(userId);
        inflight.delete(userId);
      })
      .catch((error) => {
        inflight.delete(userId);
        throw error;
      });

    inflight.set(userId, task);
    return task;
  };
}

export { memoizeSeed };
