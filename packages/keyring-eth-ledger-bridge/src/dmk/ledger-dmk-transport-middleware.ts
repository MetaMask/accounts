import type { DeviceManagementKit } from '@ledgerhq/device-management-kit';
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum';

type StartDiscoveringParameters = Parameters<
  DeviceManagementKit['startDiscovering']
>;

type StartDiscoveringResult = ReturnType<
  DeviceManagementKit['startDiscovering']
>;

type ConnectParameters = Parameters<DeviceManagementKit['connect']>;

type ConnectResult = ReturnType<DeviceManagementKit['connect']>;

type EthSigner = ReturnType<SignerEthBuilder['build']>;

type CachedSigner = { sessionId: string; signer: EthSigner };

/**
 * LedgerDMKTransportMiddleware is a middleware to communicate with the
 * Ledger device via DMK.
 * It adapts the new DMK Signer ETH to the existing bridging architectural patterns.
 */
export class LedgerDMKTransportMiddleware {
  readonly #sdk: DeviceManagementKit;

  #sessionId?: string;

  /**
   * Session created by this middleware's `connect()` call. Only managed
   * sessions are disconnected automatically; IDs assigned via `setSessionId`
   * are owned by the host.
   */
  #managedSessionId?: string;

  #cachedSigner: CachedSigner | null = null;

  constructor(sdk: DeviceManagementKit) {
    this.#sdk = sdk;
  }

  /**
   * Starts device discovery using the configured DMK transport.
   *
   * @param args - Optional DMK discovery options.
   * @returns An observable that emits discovered devices.
   */
  startDiscovering(
    ...args: StartDiscoveringParameters
  ): StartDiscoveringResult {
    return this.#sdk.startDiscovering(...args);
  }

  /**
   * Set the session ID used for subsequent DMK commands.
   *
   * Binds the middleware to an existing DMK session without disconnecting
   * any prior session. If the current session was created by this middleware's
   * `connect()`, that managed session is released when replaced.
   *
   * Invalidates any cached signer so the next `getEthSigner()` call builds a
   * fresh signer bound to the new session.
   *
   * @param sessionId - The session ID for the connected Ledger device.
   */
  async setSessionId(sessionId: string): Promise<void> {
    if (this.#sessionId === sessionId) {
      return;
    }

    const managedToRelease = this.#managedSessionId;
    this.#assignSession(sessionId);

    if (managedToRelease && managedToRelease !== sessionId) {
      await this.#sdk.disconnect({ sessionId: managedToRelease });
      this.#managedSessionId = undefined;
    }
  }

  /**
   * Method to retrieve the session ID.
   *
   * @returns The session ID.
   * @throws {Error} If `setSessionId` or `connect` has not been called yet.
   */
  getSessionId(): string {
    if (!this.#sessionId) {
      throw new Error(
        'Session ID not set. Call connect() or setSessionId() first.',
      );
    }
    return this.#sessionId;
  }

  /**
   * Connects to a discovered device and stores the resulting session ID.
   *
   * @param args - The DMK connection arguments.
   * @returns The created session ID.
   */
  async connect(...args: ConnectParameters): ConnectResult {
    const previousManagedSessionId = this.#managedSessionId;
    const sessionId = await this.#sdk.connect(...args);
    this.#assignSession(sessionId);
    this.#managedSessionId = sessionId;

    if (previousManagedSessionId && previousManagedSessionId !== sessionId) {
      await this.#sdk.disconnect({ sessionId: previousManagedSessionId });
    }

    return sessionId;
  }

  /**
   * Build (or return the cached) Ethereum signer for the current session.
   *
   * The signer is memoized per session ID. `getEthSigner()` is called from
   * five different operations on the bridge (`getPublicKey`,
   * `deviceSignTransaction`, `deviceSignMessage`, `deviceSignTypedData`,
   * `deviceSignDelegationAuthorization`); a single bridge session therefore
   * needs at most one signer instance.
   *
   * Rebuilding is not free: `SignerEthBuilder.build()` allocates a fresh
   * `DefaultContextModule` from `@ledgerhq/context-module`, which in its
   * constructor builds a DI container and instantiates the default loaders
   * (calldata, dynamic-network, external-plugin, gated-signing, nft, proxy,
   * safe, token, trusted-name, typed-data, reporter, transaction-check, plus
   * the field loaders, typed-data loader and blind-signing reporter). See
   * `node_modules/@ledgerhq/context-module/lib/esm/src/DefaultContextModule.js`.
   *
   * Neither `DefaultSignerEth` nor `DefaultContextModule` expose a
   * `dispose()` / `disconnect()` / `destroy()` method (verified against
   * `node_modules/@ledgerhq/device-signer-kit-ethereum/lib/esm/internal/DefaultSignerEth.js`
   * and the `DefaultContextModule` source above). If any of those loaders
   * hold subscriptions to device-session state, re-creating the signer on
   * every call would leak them. Caching is therefore defensive against
   * subscription leaks, not just a micro-optimization.
   *
   * The cache is invalidated by `setSessionId()` when the session changes
   * and by `dispose()` on shutdown.
   *
   * @returns An Ethereum signer instance bound to the current session.
   */
  getEthSigner(): EthSigner {
    const sessionId = this.getSessionId();
    if (this.#cachedSigner?.sessionId === sessionId) {
      return this.#cachedSigner.signer;
    }
    const signer = new SignerEthBuilder({
      dmk: this.#sdk,
      sessionId,
    }).build();
    this.#cachedSigner = { sessionId, signer };
    return signer;
  }

  /**
   * Clears the stored session ID and signer cache without disconnecting from
   * DMK.
   *
   * Use when the bridge does not own the DMK instance and the host manages
   * session lifecycle externally.
   */
  clearSession(): void {
    this.#sessionId = undefined;
    this.#managedSessionId = undefined;
    this.#cachedSigner = null;
  }

  /**
   * Disconnect the current session and clear cached state.
   *
   * Silently no-ops when no session has been established.
   *
   * @returns A promise that resolves when the session is closed.
   */
  async dispose(): Promise<void> {
    const sessionToDisconnect = this.#managedSessionId ?? this.#sessionId;
    if (sessionToDisconnect) {
      await this.#sdk.disconnect({ sessionId: sessionToDisconnect });
      this.clearSession();
    }
  }

  #assignSession(sessionId: string): void {
    this.#cachedSigner = null;
    this.#sessionId = sessionId;
  }
}
