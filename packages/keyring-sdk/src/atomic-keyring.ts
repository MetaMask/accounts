import { ReadWriteLock } from './read-write-lock';

/**
 * A vault-write callback injected into an `AtomicKeyring` at construction,
 * via the keyring builder context.
 *
 * Stateless: the calling keyring is the first parameter, so a single
 * function serves every keyring. Acquires the controller lock, verifies the
 * keyring is still registered, runs `action()`, writes the vault if and only
 * if the serialized state changed, then releases — a sub-millisecond commit
 * window.
 */
export type AtomicUpdater = (
  keyring: AtomicKeyring,
  action: () => void | Promise<void>,
) => Promise<void>;

/**
 * Brand used to mark `AtomicKeyring` instances. Registered on the global
 * symbol registry, so the brand survives duplicate copies of this package —
 * where `instanceof` would fail — and `isAtomicKeyring` keeps working.
 */
const ATOMIC_KEYRING_BRAND = Symbol.for('@metamask/keyring-sdk/atomic-keyring');

/**
 * Base class for keyrings that serialize their own operations and call back
 * into the controller only to persist state.
 *
 * Long-running work runs inside the lock helpers, entirely outside the
 * controller mutex; state is committed through `update`.
 *
 * Subclasses implementing an `init` lifecycle hook must keep it cheap —
 * in-memory work only. The controller invokes `init` under its lock, at
 * construction and vault-restore time; an `init` that performs long work,
 * or calls `update` (which needs that same, non-reentrant lock), would
 * block or deadlock the controller. Long work belongs in write operations,
 * which the controller dispatches without holding its lock.
 *
 * Snapshot reads the controller performs itself — `getAccounts` and
 * `serialize` — must stay lock-free in subclasses: the controller calls
 * them while holding its own mutex, and the updater calls `serialize` while
 * the keyring is inside a write operation. They must return immediately
 * from the current state.
 */
export abstract class AtomicKeyring {
  readonly #updater: AtomicUpdater;

  readonly #rwLock: ReadWriteLock = new ReadWriteLock();

  #updating: boolean = false;

  /**
   * The updater is required at construction — no unbound state, ever.
   *
   * @param options - Constructor options.
   * @param options.updater - The controller's vault-write callback, which
   * this keyring invokes through `update` to commit state.
   */
  constructor(options: { updater: AtomicUpdater }) {
    this.#updater = options.updater;
    (this as Record<PropertyKey, unknown>)[ATOMIC_KEYRING_BRAND] = true;
  }

  /**
   * Commit a state mutation on behalf of this keyring. Injects `this` into
   * the updater, so the controller can verify registration.
   *
   * Actions must be pure assignments of pre-computed next state: compute
   * and validate before calling `update`. A throwing action is a keyring
   * bug, and is rethrown as such. Nested `update` calls are rejected with
   * an error, never a deadlock.
   *
   * Call `update` only from within a write-locked operation, so commits
   * cannot interleave with other operations on this keyring.
   *
   * @param action - The state mutation to commit. Must be a pure assignment
   * of pre-computed next state.
   * @throws If called while another `update` call is in progress, or if the
   * action or updater throws.
   */
  protected async update(action: () => void | Promise<void>): Promise<void> {
    if (this.#updating) {
      throw new Error(
        'AtomicKeyring - Nested update() calls are not allowed. The update() action must not call update() again.',
      );
    }

    this.#updating = true;
    try {
      await this.#updater(this, action);
    } finally {
      this.#updating = false;
    }
  }

  /**
   * Run a read operation — parallel with other readers, queued behind
   * writers. Only for operations that can tolerate waiting behind a write
   * section.
   *
   * @param fn - The operation to run while holding the read lock.
   * @returns Whatever `fn` resolves to.
   */
  protected async withReadLock<Result>(
    fn: () => Promise<Result>,
  ): Promise<Result> {
    return this.#rwLock.withReadLock(fn);
  }

  /**
   * Run a write operation — exclusive with readers and other writers.
   * Long-running network work belongs here, outside the controller mutex.
   *
   * @param fn - The operation to run while holding the write lock.
   * @returns Whatever `fn` resolves to.
   */
  protected async withWriteLock<Result>(
    fn: () => Promise<Result>,
  ): Promise<Result> {
    return this.#rwLock.withWriteLock(fn);
  }
}

/**
 * Whether the value is an `AtomicKeyring`.
 *
 * Brand-based — a global-registry symbol set by the constructor — so it
 * works across duplicate copies of the package, where `instanceof` fails.
 *
 * @param value - The value to check.
 * @returns Whether the value is an `AtomicKeyring` instance.
 */
export function isAtomicKeyring(value: unknown): value is AtomicKeyring {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<PropertyKey, unknown>)[ATOMIC_KEYRING_BRAND] === true
  );
}
