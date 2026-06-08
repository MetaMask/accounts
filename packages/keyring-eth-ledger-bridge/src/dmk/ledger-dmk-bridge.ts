import {
  CloseAppCommand,
  DeviceActionStatus,
  DeviceManagementKitBuilder,
  DeviceStatus,
  GetAppAndVersionCommand,
  isSuccessCommandResult,
  OpenAppCommand,
} from '@ledgerhq/device-management-kit';
import type {
  DeviceActionState,
  DeviceManagementKit,
} from '@ledgerhq/device-management-kit';
import type { Signature } from '@ledgerhq/device-signer-kit-ethereum';
import type Transport from '@ledgerhq/hw-transport';
import type { Observable } from 'rxjs';
import { firstValueFrom, of, Subject, Subscription } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  endWith,
  filter,
  map,
} from 'rxjs/operators';

import {
  AppConfigurationResponse,
  GetAppNameAndVersionResponse,
  GetPublicKeyParams,
  GetPublicKeyResponse,
  LedgerBridge,
  LedgerSignDelegationAuthorizationParams,
  LedgerSignDelegationAuthorizationResponse,
  LedgerSignMessageParams,
  LedgerSignMessageResponse,
  LedgerSignTransactionParams,
  LedgerSignTransactionResponse,
  LedgerSignTypedDataParams,
  LedgerSignTypedDataResponse,
} from '../ledger-bridge';
import {
  isDeviceExchangeError,
  translateDmkError,
} from './dmk-error-translator';
import { EthGetAppConfigurationCommand } from './eth-get-app-configuration-command';
import {
  hexToBytes,
  stripHexPrefix,
  stripPathPrefix,
  toHexString,
} from './internal-utils';
import { LedgerDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

export type LedgerDMKBridgeOptions = {
  transportFactory?: Parameters<DeviceManagementKitBuilder['addTransport']>[0];
  dmk?: DeviceManagementKit;
};

type PublicKeyOutput = Pick<
  GetPublicKeyResponse,
  'address' | 'chainCode' | 'publicKey'
>;

/**
 * LedgerDMKBridge is a bridge between the LedgerKeyring and the
 * LedgerDMKTransportMiddleware.
 * It initializes and manages the DeviceManagementKit internally.
 * The transport factory is injected via constructor, making it platform-agnostic.
 */
export class LedgerDMKBridge implements LedgerBridge<LedgerDMKBridgeOptions> {
  readonly #transportMiddleware: LedgerDMKTransportMiddleware;

  readonly #sdk: DeviceManagementKit;

  #opts: LedgerDMKBridgeOptions;

  readonly #sessionOwnership: boolean;

  #isConnected = false;

  #sessionState$ = new Subject<{ connected: boolean }>();

  get onSessionStateChange(): Observable<{ connected: boolean }> {
    return this.#sessionState$.asObservable();
  }

  #sessionSubscription: Subscription | null = null;

  get isDeviceConnected(): boolean {
    return this.#isConnected;
  }

  get dmk(): DeviceManagementKit {
    return this.#sdk;
  }

  constructor(opts: LedgerDMKBridgeOptions) {
    if (opts.dmk) {
      this.#sdk = opts.dmk;
      this.#sessionOwnership = false;
    } else if (opts.transportFactory) {
      this.#sdk = new DeviceManagementKitBuilder()
        .addTransport(opts.transportFactory)
        .build();
      this.#sessionOwnership = true;
    } else {
      throw new Error(
        'LedgerDMKBridge requires either a transportFactory or a dmk instance.',
      );
    }
    this.#opts = opts;
    this.#transportMiddleware = new LedgerDMKTransportMiddleware(this.#sdk);
  }

  /**
   * Compatibility shim for the shared {@link LedgerBridge} interface.
   *
   * DMK session setup happens externally via `updateSessionId` or `connect`,
   * so this method is a no-op.
   *
   * @returns A promise that resolves immediately.
   */
  async init(): Promise<void> {
    return undefined;
  }

  /**
   * Destroys the bridge and cleans up resources.
   *
   * Unsubscribes session monitoring, disposes the transport middleware (if
   * owned), and completes the session-state subject so all subscribers are
   * released. A fresh subject is installed afterward so the bridge can be
   * reconnected after destroy. State cleanup happens in a `finally` block so
   * the bridge is marked disconnected even when middleware `dispose()` rejects.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  async destroy(): Promise<void> {
    this.#sessionSubscription?.unsubscribe();
    this.#sessionSubscription = null;

    try {
      if (this.#sessionOwnership) {
        await this.#transportMiddleware.dispose();
      }
    } finally {
      this.#isConnected = false;
      this.#sessionState$.next({ connected: false });
      this.#sessionState$.complete();
      this.#sessionState$ = new Subject<{ connected: boolean }>();
    }
  }

  /**
   * Returns the bridge options captured at construction.
   *
   * Compatibility shim for the shared {@link LedgerBridge} interface. The DMK
   * bridge does not use runtime-reconfigurable options; this method exists
   * only to satisfy the interface contract.
   *
   * @returns A promise that resolves with the current bridge options.
   */
  async getOptions(): Promise<LedgerDMKBridgeOptions> {
    return this.#opts;
  }

  /**
   * Replaces the stored bridge options.
   *
   * Compatibility shim for the shared {@link LedgerBridge} interface. Stored
   * options are not re-applied to the underlying DMK instance or transport
   * middleware; the values used at construction time remain in effect.
   *
   * @param opts - The options to set for the bridge.
   * @returns A promise that resolves when options are set.
   */
  async setOptions(opts: LedgerDMKBridgeOptions): Promise<void> {
    this.#opts = opts;
  }

  /**
   * Updates the session ID used for communication.
   *
   * @param sessionId - The session ID from DMK.
   * @returns A promise that resolves with true if the session was updated successfully.
   */
  async updateSessionId(sessionId: string): Promise<boolean> {
    this.#transportMiddleware.setSessionId(sessionId);
    this.#isConnected = true;
    this.#startSessionMonitoring(sessionId);
    return true;
  }

  /**
   * Starts device discovery for the configured DMK transport.
   *
   * @param args - Optional DMK discovery options.
   * @returns An observable that emits discovered devices.
   */
  startDiscovering(
    ...args: Parameters<LedgerDMKTransportMiddleware['startDiscovering']>
  ): ReturnType<LedgerDMKTransportMiddleware['startDiscovering']> {
    return this.#transportMiddleware.startDiscovering(...args);
  }

  /**
   * Connects to a discovered device using the configured DMK transport.
   *
   * @param args - The DMK connection arguments.
   * @returns The created session ID.
   */
  async connect(
    ...args: Parameters<LedgerDMKTransportMiddleware['connect']>
  ): ReturnType<LedgerDMKTransportMiddleware['connect']> {
    const sessionId = await this.#transportMiddleware.connect(...args);
    this.#isConnected = true;
    this.#startSessionMonitoring(sessionId);

    return sessionId;
  }

  /**
   * Compatibility shim for the shared {@link LedgerBridge} interface.
   *
   * DMK transport selection happens through the injected transport factory
   * at construction time, so this method is a no-op that always succeeds.
   *
   * @param _transportType - The requested transport type (ignored).
   * @returns A promise that resolves with `true`.
   */
  async updateTransportMethod(
    _transportType: string | Transport,
  ): Promise<boolean> {
    return true;
  }

  async openEthApp(): Promise<void> {
    const sessionId = this.#transportMiddleware.getSessionId();
    const result = await this.#sdk.sendCommand({
      sessionId,
      command: new OpenAppCommand({ appName: 'Ethereum' }),
    });

    if (!isSuccessCommandResult(result)) {
      throw this.#toError(result.error);
    }
  }

  async closeApps(): Promise<void> {
    const sessionId = this.#transportMiddleware.getSessionId();
    const result = await this.#sdk.sendCommand({
      sessionId,
      command: new CloseAppCommand(),
    });

    if (!isSuccessCommandResult(result)) {
      throw this.#toError(result.error);
    }
  }

  /**
   * Compatibility shim for the shared {@link LedgerBridge} interface.
   *
   * The Ethereum signer kit automatically opens the Ethereum app before each
   * signing operation via DMK's `CallTaskInAppDeviceAction`, so this method
   * is a no-op that always succeeds.
   *
   * @returns A promise that resolves with `true`.
   */
  async attemptMakeApp(): Promise<boolean> {
    return true;
  }

  /**
   * Retrieves public key/address for a given HD path.
   *
   * @param options0 - The parameters object.
   * @param options0.hdPath - The HD path to derive the public key from.
   * @returns A promise that resolves with the public key response.
   */
  async getPublicKey({
    hdPath,
  }: GetPublicKeyParams): Promise<GetPublicKeyResponse> {
    const { observable } = this.#transportMiddleware
      .getEthSigner()
      .getAddress(stripPathPrefix(hdPath), {
        checkOnDevice: false,
        returnChainCode: true,
      });
    const response =
      await this.#waitForDeviceAction<PublicKeyOutput>(observable);

    return {
      publicKey: response.publicKey,
      address: response.address,
      chainCode: response.chainCode,
    };
  }

  /**
   * Signs an Ethereum transaction.
   *
   * @param options0 - The parameters object.
   * @param options0.tx - The transaction hex string to sign.
   * @param options0.hdPath - The HD path for signing.
   * @returns A promise that resolves with the transaction signature.
   */
  async deviceSignTransaction({
    tx,
    hdPath,
  }: LedgerSignTransactionParams): Promise<LedgerSignTransactionResponse> {
    const { observable } = this.#transportMiddleware
      .getEthSigner()
      .signTransaction(stripPathPrefix(hdPath), hexToBytes(tx));
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: toHexString(signature.v),
      r: stripHexPrefix(signature.r),
      s: stripHexPrefix(signature.s),
    };
  }

  /**
   * Signs a personal message.
   *
   * @param options0 - The parameters object.
   * @param options0.hdPath - The HD path for signing.
   * @param options0.message - The message to sign.
   * @returns A promise that resolves with the message signature.
   */
  async deviceSignMessage({
    hdPath,
    message,
  }: LedgerSignMessageParams): Promise<LedgerSignMessageResponse> {
    const { observable } = this.#transportMiddleware
      .getEthSigner()
      .signMessage(stripPathPrefix(hdPath), hexToBytes(message));
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: signature.v,
      r: stripHexPrefix(signature.r),
      s: stripHexPrefix(signature.s),
    };
  }

  /**
   * Signs EIP-712 typed data.
   *
   * @param options0 - The parameters object.
   * @param options0.hdPath - The HD path for signing.
   * @param options0.message - The typed data message to sign.
   * @returns A promise that resolves with the typed data signature.
   */
  async deviceSignTypedData({
    hdPath,
    message,
  }: LedgerSignTypedDataParams): Promise<LedgerSignTypedDataResponse> {
    const { observable } = this.#transportMiddleware
      .getEthSigner()
      .signTypedData(stripPathPrefix(hdPath), message);
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: signature.v,
      r: stripHexPrefix(signature.r),
      s: stripHexPrefix(signature.s),
    };
  }

  async deviceSignDelegationAuthorization({
    hdPath,
    chainId,
    contractAddress,
    nonce,
  }: LedgerSignDelegationAuthorizationParams): Promise<LedgerSignDelegationAuthorizationResponse> {
    const { observable } = this.#transportMiddleware
      .getEthSigner()
      .signDelegationAuthorization(
        stripPathPrefix(hdPath),
        chainId,
        contractAddress,
        nonce,
      );
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: toHexString(signature.v),
      r: stripHexPrefix(signature.r),
      s: stripHexPrefix(signature.s),
    };
  }

  /**
   * Retrieves the current app name and version.
   *
   * @returns A promise that resolves with the app name and version.
   */
  async getAppNameAndVersion(): Promise<GetAppNameAndVersionResponse> {
    const sessionId = this.#transportMiddleware.getSessionId();
    const command = new GetAppAndVersionCommand();
    const result = await this.#sdk.sendCommand({
      sessionId,
      command,
    });

    if (!isSuccessCommandResult(result)) {
      throw this.#toError(result.error);
    }

    return {
      appName: result.data.name,
      version: result.data.version,
    };
  }

  /**
   * Retrieves the Ethereum app configuration using the eth-specific
   * GetAppConfiguration APDU command (CLA 0xE0, INS 0x06).
   *
   * @returns A promise that resolves with the app configuration.
   */
  async getAppConfiguration(): Promise<AppConfigurationResponse> {
    const sessionId = this.#transportMiddleware.getSessionId();
    const command = new EthGetAppConfigurationCommand();
    const result = await this.#sdk.sendCommand({
      sessionId,
      command,
    });

    if (!isSuccessCommandResult(result)) {
      throw this.#toError(result.error);
    }

    const { data } = result;

    // The `ethapp.adoc` spec for `getAppConfiguration`
    // (https://github.com/LedgerHQ/app-ethereum/blob/develop/doc/ethapp.adoc#get-app-configuration)
    // defines four flag bits. This bridge only consumes three (blind signing,
    // web3 checks enabled, web3 checks opt-in). The fourth — `0x02` *ERC 20
    // Token information needs to be provided externally* — is intentionally
    // mapped to `erc20ProvisioningNecessary: 0` because the rest of the
    // keyring does not implement the `PROVIDE ERC 20 TOKEN INFORMATION`
    // provisioning flow.
    //
    // TODO: The shared `AppConfigurationResponse` interface also requires
    // `starkEnabled` and `starkv2Supported`, which are not exposed by the
    // `getAppConfiguration` APDU at all. They are stubbed to 0 to satisfy
    // the interface contract.
    return {
      arbitraryDataEnabled: data.blindSigningEnabled ? 1 : 0,
      erc20ProvisioningNecessary: 0,
      starkEnabled: 0,
      starkv2Supported: 0,
      version: data.version,
    };
  }

  async #waitForDeviceAction<TOutput>(
    observable: Observable<DeviceActionState<TOutput, unknown, unknown>>,
  ): Promise<TOutput> {
    const state = await firstValueFrom(
      observable.pipe(
        catchError((error: unknown) => {
          throw translateDmkError(error);
        }),
        filter(
          ({ status }) =>
            status === DeviceActionStatus.Completed ||
            status === DeviceActionStatus.Error,
        ),
      ),
    );

    if (state.status === DeviceActionStatus.Completed) {
      return state.output;
    }

    if (state.status === DeviceActionStatus.Error) {
      throw translateDmkError(state.error);
    }

    // Unreachable: the filter above only lets Completed or Error states
    // through. Defensive guard retained for type safety.
    throw new Error('Ledger device action ended without completion.');
  }

  #toError(error: unknown): Error {
    if (isDeviceExchangeError(error)) {
      return translateDmkError(error);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Ledger command failed.');
  }

  #startSessionMonitoring(sessionId: string): void {
    this.#sessionSubscription?.unsubscribe();

    this.#sessionSubscription = this.#sdk
      .getDeviceSessionState({ sessionId })
      .pipe(
        map((state) => ({
          connected: state.deviceStatus !== DeviceStatus.NOT_CONNECTED,
        })),
        catchError(() => {
          return of({ connected: false } as { connected: boolean });
        }),
        endWith({ connected: false } as { connected: boolean }),
        distinctUntilChanged(
          (a: { connected: boolean }, b: { connected: boolean }) =>
            a.connected === b.connected,
        ),
      )
      .subscribe((state) => {
        this.#isConnected = state.connected;
        this.#sessionState$.next(state);
      });
  }
}
