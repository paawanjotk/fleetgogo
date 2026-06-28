export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  options: { timeoutMs?: number; intervalMs?: number; label?: string } = {}
): Promise<T> {
  const { timeoutMs = 15_000, intervalMs = 500, label = "condition" } = options;
  const deadline = Date.now() + timeoutMs;
  let lastValue: T | undefined;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      lastValue = await fn();
      if (predicate(lastValue)) {
        return lastValue;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }

  const detail =
    lastError instanceof Error
      ? lastError.message
      : lastValue !== undefined
        ? JSON.stringify(lastValue)
        : "no result";
  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms (${detail})`);
}
