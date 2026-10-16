# MetaMask Keyring SDK

This package contains the heavy runtime dependencies related to the `@metamask/keyring-api` package
to keep it as a lightweight API surface (types, structs, interfaces).

## Installation

```bash
yarn add @metamask/keyring-sdk
```

or

```bash
npm install @metamask/keyring-sdk
```

## Usage

```ts
import { EthKeyringWrapper, EthKeyringMethod } from '@metamask/keyring-sdk';
import { EthMethod, KeyringType } from '@metamask/keyring-api';

export class MyKeyringV2 extends EthKeyringWrapper<MyLegacyKeyring> {
  constructor(inner: MyLegacyKeyring) {
    super({
      type: KeyringType.Hd,
      inner,
      capabilities: { scopes: ['eip155:1'] },
    });
  }

  async getAccounts() {
    /* ... */
  }
  async createAccounts(options) {
    /* ... */
  }
  async deleteAccount(accountId) {
    /* ... */
  }
}
```

## Atomic keyrings

Most keyrings are in-memory: their operations complete in microseconds, so the
`KeyringController` can safely wrap every operation in a controller-wide mutex.
That model breaks down for keyrings whose operations are long-running network
protocols (for example, MPC ceremonies): holding the mutex for the ceremony
freezes every other controller operation, and multi-step remote/local
transitions cannot be made crash-safe.

`AtomicKeyring` inverts the lock ownership for such keyrings. The keyring
serializes its own operations with an internal read-write lock, runs long work
entirely outside the controller mutex, and calls back into the controller —
through the injected `update` callback — only when it has new state to persist.
The controller holds its mutex just for the sub-millisecond commit window.

```ts
import {
  AtomicKeyring,
  isAtomicKeyring,
  type AtomicUpdater,
} from '@metamask/keyring-sdk';

class ExampleAtomicKeyring extends AtomicKeyring {
  #state: 'uninitialized' | 'staged' | 'ready' = 'uninitialized';

  constructor(updater: AtomicUpdater) {
    super({ updater });
  }

  // Snapshot reads stay lock-free: the controller calls them while holding
  // its own mutex.
  async serialize(): Promise<Json> {
    return { state: this.#state };
  }

  async createAccount(): Promise<void> {
    // Long-running work runs inside the write lock, outside the controller
    // mutex. Readers and other writers queue behind it.
    await this.withWriteLock(async () => {
      const next = await this.#runCeremony(); // compute and validate — may fail freely

      // Checkpoint 1: stage the pre-computed state.
      await this.update(() => {
        this.#state = 'staged';
      });

      await this.#activateRemote(); // remote commit

      // Checkpoint 2: promote to ready.
      await this.update(() => {
        this.#state = 'ready';
      });
    });
  }
}

// Brand-based detection — never `instanceof`, which fails across duplicate
// copies of the package.
if (isAtomicKeyring(value)) {
  /* dispatch without holding the controller mutex */
}
```

The contract, enforced by design rather than caller discipline:

- **Actions are pure assignments.** Compute and validate the next state
  _before_ calling `update`. A throwing action is a keyring bug.
- **No nested `update` calls.** A nested call is rejected with an explicit
  error, never a deadlock.
- **Snapshot reads stay lock-free.** `getAccounts` and `serialize` are called
  by the controller while it holds its mutex (and by `update` while the keyring
  holds its write lock), so they must return immediately from the current
  state.
- **`init` stays cheap.** The controller invokes `init` under its lock, at
  construction and vault-restore time. Long work belongs in write operations.
- **No rollback.** On the atomic dispatch path a failed operation keeps every
  committed checkpoint, so the next write operation advances the state machine
  instead of re-running the ceremony.

A crash between the checkpoints leaves a persisted, recoverable intermediate
state; the next write operation advances the state machine (`staged` →
`ready`) without re-running the ceremony.

`ReadWriteLock` is also exported on its own, for keyrings that want the
read-write lock without the base class: parallel readers, exclusive writers,
first-in-first-out grant order, and a new reader always queues behind a
pending writer — so a steady stream of reads cannot starve a long write. For
read-heavy workloads, `{ priority: 'read' }` lets new readers join active
readers even while a writer is merely queued, at the cost that continuous
reads can starve a queued writer.

## Contributing

This package is part of a monorepo. Instructions for contributing can be found in the [monorepo README](https://github.com/MetaMask/accounts#readme).
