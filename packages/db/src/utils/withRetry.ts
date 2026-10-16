export type RetryableErrorCode = "ENOBUFS" | "ECONNRESET" | "ECONNREFUSED" | "ETIMEDOUT";

export interface WithRetryOptions {
  retries?: number;
  delayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
}

const DEFAULT_RETRYABLE_CODES: string[] = ["ENOBUFS", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT"];

function defaultShouldRetry(error: unknown): boolean {
  if (error && typeof error === "object" && "code" in error) {
    return DEFAULT_RETRYABLE_CODES.includes(String(error.code));
  }
  // AggregateError from pg Pool may not have .code directly
  if (error instanceof AggregateError) {
    for (const e of error.errors) {
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        DEFAULT_RETRYABLE_CODES.includes(String(e.code))
      ) {
        return true;
      }
      if (e instanceof Error) {
        const msg = e.message.toUpperCase();
        if (DEFAULT_RETRYABLE_CODES.some((code) => msg.includes(code))) {
          return true;
        }
      }
    }
  }
  // Some environments throw plain Error with ENOBUFS message
  if (error instanceof Error) {
    const msg = error.message.toUpperCase();
    if (DEFAULT_RETRYABLE_CODES.some((code) => msg.includes(code))) {
      return true;
    }
  }
  return false;
}

/**
 * Retry a transient database/network operation a few times with a short delay.
 * Designed to absorb ENOBUFS / ECONNRESET bursts in dev mode.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const { retries = 2, delayMs = 100, shouldRetry = defaultShouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
