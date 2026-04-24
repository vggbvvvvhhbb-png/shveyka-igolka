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
