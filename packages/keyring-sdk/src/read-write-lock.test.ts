import { ReadWriteLock } from './read-write-lock';

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

describe('ReadWriteLock', () => {
  describe('withReadLock', () => {
    it('returns the result of the callback', async () => {
      const lock = new ReadWriteLock();

      expect(await lock.withReadLock(async () => 'result')).toBe('result');
    });

    it('allows multiple readers to hold the lock simultaneously', async () => {
      const lock = new ReadWriteLock();
      const gate = createDeferred<void>();
      const started: number[] = [];

      const first = lock.withReadLock(async () => {
        started.push(1);
        await gate.promise;
      });
      const second = lock.withReadLock(async () => {
        started.push(2);
        await gate.promise;
      });
      const third = lock.withReadLock(async () => {
        started.push(3);
        await gate.promise;
      });
      await flush();

      // All three readers started, even though none has finished: readers
      // hold the lock in parallel.
      expect(started).toStrictEqual([1, 2, 3]);

      gate.resolve();
      await Promise.all([first, second, third]);
    });

    it('releases the lock when the callback throws synchronously', async () => {
      const lock = new ReadWriteLock();

      await expect(
        lock.withReadLock(async (): Promise<never> => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      // The lock is usable again after the failure.
      expect(await lock.withReadLock(async () => 'ok')).toBe('ok');
    });

    it('releases the lock when the callback rejects', async () => {
      const lock = new ReadWriteLock();

      await expect(
        lock.withReadLock(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      expect(await lock.withReadLock(async () => 'ok')).toBe('ok');
    });
  });

  describe('withWriteLock', () => {
    it('returns the result of the callback', async () => {
      const lock = new ReadWriteLock();

      expect(await lock.withWriteLock(async () => 'result')).toBe('result');
    });

    it('waits for active readers to finish before granting the write lock', async () => {
      const lock = new ReadWriteLock();
      const gate = createDeferred<void>();
      const order: string[] = [];

      const read = lock.withReadLock(async () => {
        order.push('read:start');
        await gate.promise;
        order.push('read:end');
      });
      const write = lock.withWriteLock(async () => {
        order.push('write:start');
      });
      await flush();

      // The write operation has not started while the read is active.
      expect(order).toStrictEqual(['read:start']);

      gate.resolve();
      await Promise.all([read, write]);

      expect(order).toStrictEqual(['read:start', 'read:end', 'write:start']);
    });

    it('excludes other writers while a writer holds the lock', async () => {
      const lock = new ReadWriteLock();
      const gate = createDeferred<void>();
      const order: string[] = [];

      const first = lock.withWriteLock(async () => {
        order.push('first:start');
        await gate.promise;
        order.push('first:end');
      });
      const second = lock.withWriteLock(async () => {
        order.push('second:start');
      });
      await flush();

      expect(order).toStrictEqual(['first:start']);

      gate.resolve();
      await Promise.all([first, second]);

      expect(order).toStrictEqual(['first:start', 'first:end', 'second:start']);
    });

    it('releases the lock when the callback throws synchronously', async () => {
      const lock = new ReadWriteLock();

      await expect(
        lock.withWriteLock(async (): Promise<never> => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      expect(await lock.withWriteLock(async () => 'ok')).toBe('ok');
    });

    it('releases the lock when the callback rejects', async () => {
      const lock = new ReadWriteLock();

      await expect(
        lock.withWriteLock(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow('fail');

      expect(await lock.withWriteLock(async () => 'ok')).toBe('ok');
    });
  });

  describe('grant ordering', () => {
    it('grants waiters in first-in-first-out order', async () => {
      const lock = new ReadWriteLock();
      const gate = createDeferred<void>();
      const order: string[] = [];

      const firstWrite = lock.withWriteLock(async () => {
        await gate.promise;
      });

      // Queued in arrival order: read, write, read.
      const queuedRead = lock.withReadLock(async () => {
        order.push('queued-read');
      });
      const queuedWrite = lock.withWriteLock(async () => {
        order.push('queued-write');
      });
      const queuedRead2 = lock.withReadLock(async () => {
        order.push('queued-read-2');
      });
      await flush();

      expect(order).toStrictEqual([]);

      gate.resolve();
      await Promise.all([firstWrite, queuedRead, queuedWrite, queuedRead2]);

      expect(order).toStrictEqual([
        'queued-read',
        'queued-write',
        'queued-read-2',
      ]);
    });

    it('queues new readers behind a pending writer', async () => {
      const lock = new ReadWriteLock();
      const readGate = createDeferred<void>();
      const writeGate = createDeferred<void>();
      const started: Record<string, boolean> = {
        read: false,
        write: false,
        lateRead: false,
      };
      const order: string[] = [];

      const read = lock.withReadLock(async () => {
        started.read = true;
        order.push('read');
        await readGate.promise;
      });

      // A writer queues up while the reader is active...
      const write = lock.withWriteLock(async () => {
        started.write = true;
        order.push('write');
        await writeGate.promise;
      });

      // ...and a later reader must queue behind the pending writer, even
      // though a reader is active.
      const lateRead = lock.withReadLock(async () => {
        started.lateRead = true;
        order.push('late-read');
      });
      await flush();

      expect(started).toStrictEqual({
        read: true,
        write: false,
        lateRead: false,
      });

      readGate.resolve();
      await flush();

      // The pending writer was granted next, not the later reader.
      expect(started).toStrictEqual({
        read: true,
        write: true,
        lateRead: false,
      });

      writeGate.resolve();
      await Promise.all([read, write, lateRead]);

      expect(order).toStrictEqual(['read', 'write', 'late-read']);
    });

    it('grants consecutive queued readers together', async () => {
      const lock = new ReadWriteLock();
      const writeGate = createDeferred<void>();
      const readGate = createDeferred<void>();
      const order: string[] = [];

      const write = lock.withWriteLock(async () => {
        await writeGate.promise;
      });

      const firstRead = lock.withReadLock(async () => {
        order.push('read-1');
        await readGate.promise;
      });
      const secondRead = lock.withReadLock(async () => {
        order.push('read-2');
      });
      const thirdRead = lock.withReadLock(async () => {
        order.push('read-3');
      });
      await flush();

      expect(order).toStrictEqual([]);

      writeGate.resolve();
      await flush();

      // All queued readers were granted together: the first is active and
      // holding the others open, before any of them finished.
      expect(order).toStrictEqual(['read-1', 'read-2', 'read-3']);

      readGate.resolve();
      await Promise.all([write, firstRead, secondRead, thirdRead]);
    });
  });

  describe('priority option', () => {
    it('lets new readers start while a writer is pending, with read priority', async () => {
      const lock = new ReadWriteLock({ priority: 'read' });
      const readGate = createDeferred<void>();
      const writeGate = createDeferred<void>();
      const order: string[] = [];

      const read = lock.withReadLock(async () => {
        order.push('read:start');
        await readGate.promise;
        order.push('read:end');
      });

      // A writer queues up while the reader is active...
      const write = lock.withWriteLock(async () => {
        order.push('write');
        await writeGate.promise;
      });

      // ...and a later reader starts immediately, jumping the merely
      // pending writer.
      const lateRead = lock.withReadLock(async () => {
        order.push('late-read');
      });
      await flush();

      expect(order).toStrictEqual(['read:start', 'late-read']);

      // The pending writer still waits for the jumping reader to finish.
      readGate.resolve();
      writeGate.resolve();
      await Promise.all([read, write, lateRead]);

      expect(order).toStrictEqual([
        'read:start',
        'late-read',
        'read:end',
        'write',
      ]);
    });

    it('still queues readers behind an active writer, with read priority', async () => {
      const lock = new ReadWriteLock({ priority: 'read' });
      const writeGate = createDeferred<void>();
      const order: string[] = [];

      const write = lock.withWriteLock(async () => {
        order.push('write');
        await writeGate.promise;
        order.push('write:end');
      });
      await flush();

      expect(order).toStrictEqual(['write']);

      const read = lock.withReadLock(async () => {
        order.push('read');
      });
      await flush();

      // The writer is active — read priority does not jump an active
      // writer, only a queued one.
      expect(order).toStrictEqual(['write']);

      writeGate.resolve();
      await Promise.all([write, read]);

      expect(order).toStrictEqual(['write', 'write:end', 'read']);
    });
  });
});
