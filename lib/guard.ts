// Loop/timeout guards: no operation may retry more than MAX_ATTEMPTS times or
// run past its deadline — bounded exits instead of infinite loops or hangs.

export const MAX_ATTEMPTS = 5;
export const DEFAULT_DEADLINE_MS = 10_000;

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { maxAttempts?: number; deadlineMs?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? MAX_ATTEMPTS;
  const deadlineMs = opts.deadlineMs ?? DEFAULT_DEADLINE_MS;
  const start = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (Date.now() - start >= deadlineMs) break;
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      // Brief backoff between attempts, but never past the deadline.
      const delay = 200 * attempt;
      if (attempt < maxAttempts && Date.now() - start + delay < deadlineMs) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Operation failed after ${maxAttempts} attempts or ${deadlineMs}ms deadline`);
}

// fetch that aborts after `ms` unless the caller supplied its own signal.
// Used as the Supabase client's transport so no DB/auth call can hang.
export function timeoutFetch(ms: number = DEFAULT_DEADLINE_MS): typeof fetch {
  return (input, init) =>
    fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(ms) });
}

export function isTimeoutError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "TimeoutError" || err.name === "AbortError" || err instanceof DOMException)
  );
}
