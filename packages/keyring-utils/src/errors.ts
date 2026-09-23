import type { AccountId } from './types';

/**
 * Extract a human-readable message from an unknown error value.
 *
 * This is useful for handling `Promise.allSettled` rejections or other
 * `unknown` error values, where the value may or may not be an `Error`
 * instance.
 *
 * @param error - The error value to extract a message from.
 * @returns The error message string.
 */
export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Collect failures from `Promise.allSettled` results, keyed by account ID.
 *
 * Each rejected result is converted to an error message via
 * {@link toErrorMessage}. Fulfilled results are ignored.
 *
 * @param accountIds - The account IDs corresponding to each result, in order.
 * @param results - The settled results from `Promise.allSettled`.
 * @returns A map of account IDs that failed, to their error messages, or
 * `undefined` if all results were fulfilled.
 */
export function toAccountsFailures(
  accountIds: AccountId[],
  results: PromiseSettledResult<unknown>[],
): Record<AccountId, string> | undefined {
  const failures: Record<AccountId, string> = {};
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const id = accountIds[index] as AccountId;
      failures[id] = toErrorMessage(result.reason);
    }
  });
  return Object.keys(failures).length > 0 ? failures : undefined;
}
