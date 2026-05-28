import { withRetry, ExponentialBackoff, isRetryableError } from './resilience';

describe('resilience', () => {
  describe('withRetry', () => {
    it('returns the result on first success', async () => {
      const result = await withRetry(async () => Promise.resolve(42), {
        maxRetries: 3,
      });
      expect(result).toBe(42);
    });

    it('retries on failure and eventually succeeds', async () => {
      let attempt = 0;
      const fn = async (): Promise<string> => {
        attempt += 1;
        if (attempt < 3) {
          throw new Error('transient');
        }
        return 'ok';
      };

      const result = await withRetry(fn, { maxRetries: 3 });
      expect(result).toBe('ok');
      expect(attempt).toBe(3);
    }, 15000);

    it('throws after exhausting retries', async () => {
      const fn = async (): Promise<never> => {
        throw new Error('permanent');
      };

      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow(
        'permanent',
      );
    }, 15000);

    it('respects shouldRetry predicate', async () => {
      const fn = async (): Promise<never> => {
        throw new Error('not-retryable');
      };

      await expect(
        withRetry(fn, {
          maxRetries: 3,
          shouldRetry: (error) => error.message === 'retryable',
        }),
      ).rejects.toThrow('not-retryable');
    });

    it('calls onRetry callback', async () => {
      const onRetry = jest.fn();
      let attempt = 0;
      const fn = async (): Promise<string> => {
        attempt += 1;
        if (attempt < 2) {
          throw new Error('fail');
        }
        return 'ok';
      };

      await withRetry(fn, { maxRetries: 3, onRetry });
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('ExponentialBackoff', () => {
    it('starts with initial delay', () => {
      const backoff = new ExponentialBackoff(100, 5000);
      expect(backoff.next()).toBe(100);
    });

    it('doubles each step', () => {
      const backoff = new ExponentialBackoff(100, 5000);
      expect(backoff.next()).toBe(100);
      expect(backoff.next()).toBe(200);
      expect(backoff.next()).toBe(400);
    });

    it('caps at maxMs', () => {
      const backoff = new ExponentialBackoff(100, 300);
      expect(backoff.next()).toBe(100);
      expect(backoff.next()).toBe(200);
      expect(backoff.next()).toBe(300);
      expect(backoff.next()).toBe(300);
    });

    it('resets to initial', () => {
      const backoff = new ExponentialBackoff(100, 5000);
      backoff.next();
      backoff.next();
      backoff.reset();
      expect(backoff.next()).toBe(100);
    });

    it('supports custom multiplier', () => {
      const backoff = new ExponentialBackoff(100, 5000, 3);
      expect(backoff.next()).toBe(100);
      expect(backoff.next()).toBe(300);
      expect(backoff.next()).toBe(900);
    });
  });

  describe('isRetryableError', () => {
    it('returns true for ECONNREFUSED', () => {
      const error = new Error() as Error & { code: string };
      error.code = 'ECONNREFUSED';
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for ETIMEDOUT', () => {
      const error = new Error() as Error & { code: string };
      error.code = 'ETIMEDOUT';
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns true for error message containing ECONNRESET', () => {
      const error = new Error('Connection failed: ECONNRESET');
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      const error = new Error('Something else went wrong');
      expect(isRetryableError(error)).toBe(false);
    });
  });
});
