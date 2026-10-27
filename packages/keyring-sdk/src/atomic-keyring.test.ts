import type { AtomicUpdater } from './atomic-keyring';
import { AtomicKeyring, isAtomicKeyring } from './atomic-keyring';

/**
 * The states of the test keyring's state machine: an uninitialized keyring,
 * a staged (mid-transition) keyring, and a ready keyring.
 */
type TestState = 'uninitialized' | 'staged' | 'ready';

/**
 * The remote service the test keyring talks to, standing in for the
 * multi-second ceremonies of a real atomic keyring.
 */
type RemoteService = {
  performCeremony: () => Promise<void>;
  activate: () => Promise<void>;
};

/**
 * A promise that can be resolved or rejected from the outside.
 */
type Deferred<Value> = {
  promise: Promise<Value>;
  resolve: (value: Value) => void;
  reject: (reason: Error) => void;
};

/**
 * Create a deferred promise.
 *
 * @returns A deferred promise, with external `resolve` and `reject`.
 */
function createDeferred<Value>(): Deferred<Value> {
  let resolve!: (value: Value) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<Value>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}

/**
 * Let pending promise continuations (microtasks) run, so queued waiters and
 * callbacks get a chance to start.
 */
async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

/**
 * Create a mock remote service whose operations resolve immediately.
 *
 * @returns The mock remote service.
 */
function createRemote(): jest.Mocked<RemoteService> {
  return {
    performCeremony: jest.fn().mockResolvedValue(undefined),
    activate: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * A minimal atomic keyring used to exercise the base class: a checkpointed
 * creation flow (`uninitialized` → `staged` → `ready`) around a remote
 * activation, plus a recovery path that advances a staged state without
 * re-running the ceremony.
 */
class TestAtomicKeyring extends AtomicKeyring {
  readonly #remote: RemoteService;

  #state: TestState = 'uninitialized';

  constructor(options: { updater: AtomicUpdater; remote: RemoteService }) {
    super({ updater: options.updater });
    this.#remote = options.remote;
  }

  /**
   * The current state. Deliberately lock-free, like the snapshot reads the
   * controller performs itself.
   *
   * @returns The current state.
   */
  get state(): TestState {
    return this.#state;
  }

  /**
   * Checkpointed creation: a long-running ceremony, a staged commit, a
   * remote activation, then promotion of the staged state. A failure after
   * the first checkpoint leaves the staged state committed, so the next
   * write operation can recover instead of re-running the ceremony.
   */
  async createAccount(): Promise<void> {
    await this.withWriteLock(async () => {
      await this.#remote.performCeremony();

      await this.update(() => {
        this.#state = 'staged';
      });

      await this.#remote.activate();

      await this.update(() => {
        this.#state = 'ready';
      });
    });
  }

  /**
   * Recovery: advance a staged state machine to ready, without re-running
   * the ceremony.
   */
  async recover(): Promise<void> {
    await this.withWriteLock(async () => {
      if (this.#state !== 'staged') {
        return;
      }
      await this.#remote.activate();
      await this.update(() => {
        this.#state = 'ready';
      });
    });
  }

  /**
   * Expose `update` for direct testing.
   *
   * @param action - The state mutation to commit.
   * @returns A promise that resolves when the update completes.
   */
  async commit(action: () => void | Promise<void>): Promise<void> {
    return this.update(action);
  }

  /**
   * Expose `withReadLock` for direct testing.
   *
   * @param fn - The operation to run while holding the read lock.
   * @returns Whatever `fn` resolves to.
   */
  async read<Result>(fn: () => Promise<Result>): Promise<Result> {
    return this.withReadLock(fn);
  }

  /**
   * Expose `withWriteLock` for direct testing.
   *
   * @param fn - The operation to run while holding the write lock.
   * @returns Whatever `fn` resolves to.
   */
  async write<Result>(fn: () => Promise<Result>): Promise<Result> {
    return this.withWriteLock(fn);
  }
}

/**
 * Create a test keyring with a recording updater, which stands in for the
 * controller's vault-write callback and records the keyring state after
 * every committed action.
 *
 * @param options - Setup options.
 * @param options.updater - A custom updater, replacing the recording one.
 * @returns The test keyring, its remote service, and the recorded writes.
 */
function setup(options: { updater?: AtomicUpdater } = {}): {
  keyring: TestAtomicKeyring;
  remote: jest.Mocked<RemoteService>;
  writes: TestState[];
  updater: AtomicUpdater;
} {
  const remote = createRemote();
  const writes: TestState[] = [];
  const updater: AtomicUpdater =
    options.updater ??
    (async (keyring, action): Promise<void> => {
      await action();
      writes.push((keyring as TestAtomicKeyring).state);
    });
  const keyring = new TestAtomicKeyring({ updater, remote });
  return { keyring, remote, writes, updater };
}

describe('AtomicKeyring', () => {
  describe('constructor', () => {
    it('brands the instance as an atomic keyring', () => {
      const { keyring } = setup();

      expect(isAtomicKeyring(keyring)).toBe(true);
    });
  });

  describe('update', () => {
    it('passes the keyring instance and the action to the updater', async () => {
      const updater = jest.fn(
        async (_keyring: AtomicKeyring, action: () => void | Promise<void>) => {
          await action();
        },
      );
      const { keyring } = setup({ updater });
      const action = jest.fn(async () => undefined);

      await keyring.commit(action);

      expect(updater).toHaveBeenCalledWith(keyring, action);
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('runs the action before resolving', async () => {
      const { keyring } = setup();
      let actionDone = false;

      await keyring.commit(async () => {
        actionDone = true;
      });

      expect(actionDone).toBe(true);
    });

    it('rethrows errors thrown by the action', async () => {
      const updater = jest.fn(
        async (_keyring: AtomicKeyring, action: () => void | Promise<void>) => {
          await action();
        },
      );
      const { keyring } = setup({ updater });

      await expect(
        keyring.commit(async () => {
          throw new Error('keyring bug');
        }),
      ).rejects.toThrow('keyring bug');

      // The updater ran and rethrew the action error.
      expect(updater).toHaveBeenCalledTimes(1);
    });

    it('propagates errors thrown by the updater', async () => {
      const updater: AtomicUpdater = async () => {
        throw new Error('vault write failed');
      };
      const { keyring } = setup({ updater });

      await expect(keyring.commit(async () => undefined)).rejects.toThrow(
        'vault write failed',
      );
    });

    it('rejects nested update calls with an explicit error', async () => {
      const { keyring } = setup();

      await expect(
        keyring.commit(async () => {
          await keyring.commit(async () => undefined);
        }),
      ).rejects.toThrow('Nested update() calls are not allowed');
    });

    it('allows update calls after a nested call was rejected', async () => {
      const { keyring, writes } = setup();

      await expect(
        keyring.commit(async () => {
          await keyring.commit(async () => undefined);
        }),
      ).rejects.toThrow('Nested update() calls are not allowed');

      // The re-entrancy guard was released, so a fresh update goes through.
      await keyring.createAccount();
      expect(writes).toStrictEqual(['staged', 'ready']);
    });
  });

  describe('withReadLock and withWriteLock', () => {
    it('runs read operations in parallel', async () => {
      const { keyring } = setup();
      const gate = createDeferred<void>();
      const started: string[] = [];

      const first = keyring.read(async () => {
        started.push('first');
        await gate.promise;
      });
      const second = keyring.read(async () => {
        started.push('second');
        await gate.promise;
      });
      await flush();

      // Both reads started, even though neither has finished.
      expect(started).toStrictEqual(['first', 'second']);

      gate.resolve();
      await Promise.all([first, second]);
    });

    it('excludes a write operation from a concurrent read operation', async () => {
      const { keyring } = setup();
      const gate = createDeferred<void>();
      const order: string[] = [];

      const read = keyring.read(async () => {
        order.push('read');
        await gate.promise;
        order.push('read:end');
      });
      const write = keyring.write(async () => {
        order.push('write');
      });
      await flush();

      // The write operation has not started while the read is active.
      expect(order).toStrictEqual(['read']);

      gate.resolve();
      await Promise.all([read, write]);

      expect(order).toStrictEqual(['read', 'read:end', 'write']);
    });
  });

  describe('isAtomicKeyring', () => {
    it('returns true for an AtomicKeyring subclass instance', () => {
      const { keyring } = setup();

      expect(isAtomicKeyring(keyring)).toBe(true);
    });

    it('returns false for values that are not atomic keyrings', () => {
      expect(isAtomicKeyring(null)).toBe(false);
      expect(isAtomicKeyring(undefined)).toBe(false);
      expect(isAtomicKeyring({})).toBe(false);
      expect(isAtomicKeyring({ type: 'Simple Keyring' })).toBe(false);
      expect(isAtomicKeyring(() => undefined)).toBe(false);
      expect(isAtomicKeyring('keyring')).toBe(false);
    });
  });

  describe('checkpointed commit flow', () => {
    it('persists each checkpoint as it is committed', async () => {
      const { keyring, writes, remote } = setup();

      await keyring.createAccount();

      expect(keyring.state).toBe('ready');
      expect(writes).toStrictEqual(['staged', 'ready']);
      expect(remote.performCeremony).toHaveBeenCalledTimes(1);
      expect(remote.activate).toHaveBeenCalledTimes(1);
    });

    it('keeps committed checkpoints when a later step fails', async () => {
      const { keyring, writes, remote } = setup();
      remote.activate.mockRejectedValueOnce(
        new Error('remote activation failed'),
      );

      await expect(keyring.createAccount()).rejects.toThrow(
        'remote activation failed',
      );

      // The staged checkpoint survived the failure — there is no rollback.
      expect(keyring.state).toBe('staged');
      expect(writes).toStrictEqual(['staged']);
    });

    it('recovers a staged state on the next write operation without re-running the ceremony', async () => {
      const { keyring, writes, remote } = setup();
      remote.activate.mockRejectedValueOnce(
        new Error('remote activation failed'),
      );
      await expect(keyring.createAccount()).rejects.toThrow(
        'remote activation failed',
      );

      await keyring.recover();

      expect(keyring.state).toBe('ready');
      expect(writes).toStrictEqual(['staged', 'ready']);
      expect(remote.performCeremony).toHaveBeenCalledTimes(1);
      expect(remote.activate).toHaveBeenCalledTimes(2);
    });

    it('leaves non-staged states untouched during recovery', async () => {
      const { keyring, writes, remote } = setup();

      await keyring.recover();

      expect(keyring.state).toBe('uninitialized');
      expect(writes).toStrictEqual([]);
      expect(remote.activate).not.toHaveBeenCalled();
    });
  });
});
