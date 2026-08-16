/**
 * Runs `worker` over `items` with at most `limit` in flight at once, yielding
 * each `{ item, result }` (or `{ item, error }`) as soon as it settles —
 * not in input order. Used to keep several Gemini calls in flight for bulk
 * diagnosis without unbounded parallelism.
 */
export async function* mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>
): AsyncGenerator<{ item: T; result: R } | { item: T; error: unknown }> {
  let cursor = 0;
  const inFlight = new Map<number, Promise<{ token: number; item: T; result?: R; error?: unknown }>>();

  function launch(index: number) {
    const item = items[index];
    const promise = worker(item)
      .then((result) => ({ token: index, item, result }))
      .catch((error) => ({ token: index, item, error }));
    inFlight.set(index, promise);
  }

  while (cursor < items.length && inFlight.size < limit) {
    launch(cursor);
    cursor++;
  }

  while (inFlight.size > 0) {
    const settled = await Promise.race(inFlight.values());
    inFlight.delete(settled.token);

    if (cursor < items.length) {
      launch(cursor);
      cursor++;
    }

    if ("error" in settled) {
      yield { item: settled.item, error: settled.error };
    } else {
      yield { item: settled.item, result: settled.result as R };
    }
  }
}
