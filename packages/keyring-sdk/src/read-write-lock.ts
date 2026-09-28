/**
 * A mode in which the lock can be held: shared (`'read'`) or exclusive
 * (`'write'`).
 */
type LockMode = 'read' | 'write';

/**
 * A queued lock-acquisition request.
 */
type LockWaiter = {
  /** The mode being acquired. */
  mode: LockMode;
  /** Resolves once the lock has been granted. */
  resolve: () => void;
};

/**
 * Which mode a {@link ReadWriteLock} prioritizes when both are contended.
 */
export type ReadWriteLockPriority = 'read' | 'write';

/**
 * Options for constructing a {@link ReadWriteLock}.
 */
export type ReadWriteLockOptions = {
  /**
   * Which mode takes priority when both are contended. Defaults to
   * `'write'`.
   *
   * - `'write'`: a pending writer blocks new readers, so a steady stream of
   * reads cannot starve a long write.
   * - `'read'`: new readers join active readers even while a writer is
   * queued, for better read latency — at the cost that a continuous stream
   * of reads can starve a queued writer.
   */
  priority?: ReadWriteLockPriority;
};

/**
 * A read-write lock: multiple readers may hold the lock simultaneously,
 * while writers hold it exclusively.
 *
 * Grant order is first-in-first-out, and the lock is write-preferring by
 * default: a pending writer blocks new readers, and consecutive queued
 * readers are granted together once the lock turns over to them. Set the
 * `priority` option to `'read'` to let new readers join active readers even
 * while a writer is queued — better read latency, at the cost that
 * continuous reads can starve a queued writer. The lock is always released
 * when the callback settles, whether it resolves or throws.
 */
export class ReadWriteLock {
  #readers: number = 0;

  #writer: boolean = false;

  readonly #waiters: LockWaiter[] = [];

  readonly #priority: ReadWriteLockPriority;

  /**
   * @param options - Lock options.
   * @param options.priority - Which mode takes priority when both are
   * contended. Defaults to `'write'`.
   */
  constructor(options: ReadWriteLockOptions = {}) {
    this.#priority = options.priority ?? 'write';
  }

  /**
   * Run a read operation — parallel with other readers, exclusive with
   * writers. New readers queue behind any pending writer.
   *
   * @param fn - The operation to run while holding the read lock.
   * @returns Whatever `fn` resolves to.
   */
  async withReadLock<Result>(fn: () => Promise<Result>): Promise<Result> {
    return this.#withLock('read', fn);
  }

  /**
   * Run a write operation — exclusive with readers and other writers.
   *
   * @param fn - The operation to run while holding the write lock.
   * @returns Whatever `fn` resolves to.
   */
  async withWriteLock<Result>(fn: () => Promise<Result>): Promise<Result> {
    return this.#withLock('write', fn);
  }

  /**
   * Acquire the lock in the given mode, run the operation, and release the
   * lock — including on a throw, so the lock can never leak.
   *
   * @param mode - The mode in which to hold the lock.
   * @param fn - The operation to run while holding the lock.
   * @returns Whatever `fn` resolves to.
   */
  async #withLock<Result>(
    mode: LockMode,
    fn: () => Promise<Result>,
  ): Promise<Result> {
    await this.#acquire(mode);
    try {
      return await fn();
    } finally {
      this.#release(mode);
    }
  }

  /**
   * Whether any acquisition request is queued, waiting for the lock to turn
   * over to it. A queued waiter always blocks newcomers, which keeps the
   * grant order first-in-first-out.
   *
   * @returns Whether any acquisition request is queued.
   */
  #hasWaiters(): boolean {
    return this.#waiters.length > 0;
  }

  /**
   * Whether the lock is currently held for reading. Readers hold the lock
   * in parallel, so this does not mean an exclusive hold.
   *
   * @returns Whether any reader is active.
   */
  #isReading(): boolean {
    return this.#readers > 0;
  }

  /**
   * Whether the lock is currently held for writing. A writer holds the lock
   * exclusively: while writing, no other holder — reader or writer — can
   * be active.
   *
   * @returns Whether a writer is active.
   */
  #isWriting(): boolean {
    return this.#writer;
  }

  /**
   * Acquire the lock in the given mode, queuing when it cannot be granted
   * immediately.
   *
   * @param mode - The mode to acquire.
   * @returns A promise that resolves once the lock is held.
   */
  async #acquire(mode: LockMode): Promise<void> {
    return new Promise<void>((resolve) => {
      let acquire = true;
      if (this.#isWriting()) {
        // Writing is exclusive, so we cannot acquire the lock if a writer is active.
        acquire = false;
      } else if (mode === 'write' && this.#isReading()) {
        // Writing is exclusive with readers, so we cannot acquire the lock if any reader is active.
        acquire = false;
      } else if (
        mode === 'read' &&
        this.#hasWaiters() &&
        this.#priority !== 'read'
      ) {
        // We cannot acquire the lock for reading if there are waiters, unless priority is 'read'.
        acquire = false;
      }

      if (acquire) {
        this.#grant(mode);
        resolve();
      } else {
        // We cannot grant the lock immediately, so we queue the waiter.
        this.#waiters.push({ mode, resolve });
      }
    });
  }

  /**
   * Grant the lock in the given mode. Only called when the grant is legal.
   *
   * @param mode - The mode to grant.
   */
  #grant(mode: LockMode): void {
    if (mode === 'read') {
      this.#readers += 1;
    } else {
      this.#writer = true;
    }
  }

  /**
   * Release the lock in the given mode, then grant queued waiters in order.
   *
   * @param mode - The mode being released.
   */
  #release(mode: LockMode): void {
    if (mode === 'read') {
      this.#readers -= 1;
    } else {
      this.#writer = false;
    }
    this.#drain();
  }

  /**
   * Grant queued waiters, in order, while the front of the queue can be
   * granted. Consecutive queued readers are granted together; a granted
   * writer blocks everything behind it. Unlike a newcomer, the front
   * waiter is never blocked by queued waiters — everyone behind it
   * arrived later — so only active holders block a grant here.
   */
  #drain(): void {
    let waiter: LockWaiter | undefined = this.#waiters.shift();
    while (waiter !== undefined) {
      let acquire = true;

      if (this.#isWriting()) {
        // Writing is exclusive, so the waiter cannot acquire the lock if a writer is active.
        acquire = false;
      } else if (waiter.mode === 'write' && this.#isReading()) {
        // Writing is exclusive with readers, so the waiter cannot acquire the lock if any reader is active.
        acquire = false;
      }

      if (acquire) {
        // Grant the front waiter and continue with the next one, so consecutive queued readers are granted together.
        this.#grant(waiter.mode);
        waiter.resolve();
        waiter = this.#waiters.shift();
      } else {
        // The waiter is blocked by an active holder; put it back at the front and stop.
        this.#waiters.unshift(waiter);
        return;
      }
    }
  }
}
