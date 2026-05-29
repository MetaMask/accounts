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
import { firstValueFrom, of, Subject } from 'rxjs';
import {
  catchError,
  distinctUntilChanged,
  endWith,
  filter,
  map,
} from 'rxjs/operators';

import {
  isDeviceExchangeError,
  translateDmkError,
} from './dmk-error-translator';
import { EthGetAppConfigurationCommand } from './eth-get-app-configuration-command';
import {
  AppConfigurationResponse,
  GetAppNameAndVersionResponse,
  GetPublicKeyParams,
  GetPublicKeyResponse,
  LedgerBridge,
  LedgerBridgeOptions,
  LedgerSignDelegationAuthorizationParams,
  LedgerSignDelegationAuthorizationResponse,
  LedgerSignMessageParams,
  LedgerSignMessageResponse,
  LedgerSignTransactionParams,
  LedgerSignTransactionResponse,
  LedgerSignTypedDataParams,
  LedgerSignTypedDataResponse,
} from './ledger-bridge';
import { LedgerMobileDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

export type LedgerDMKBridgeOptions = {
  transportFactory?: Parameters<DeviceManagementKitBuilder['addTransport']>[0];
  dmk?: DeviceManagementKit;
};

/**
 * @deprecated Use {@link LedgerDMKBridge} instead.
 */
export type LedgerMobileDMKBridgeOptions = LedgerDMKBridgeOptions;

type PublicKeyOutput = Pick<
  GetPublicKeyResponse,
  'address' | 'chainCode' | 'publicKey'
>;

/**
 * LedgerDMKBridge is a bridge between the LedgerKeyring and the
 * LedgerMobileDMKTransportMiddleware.
 * It initializes and manages the DeviceManagementKit internally.
 * The transport factory is injected via constructor, making it platform-agnostic.
 */
export class LedgerDMKBridge implements LedgerBridge<LedgerDMKBridgeOptions> {
  readonly #transportMiddleware: LedgerMobileDMKTransportMiddleware;

  readonly #sdk: DeviceManagementKit;

  #opts: LedgerDMKBridgeOptions;

  readonly #sessionOwnership: boolean;

  #isConnected = false;

  readonly #sessionState$ = new Subject<{ connected: boolean }>();

  readonly onSessionStateChange: Observable<{ connected: boolean }> =
    this.#sessionState$.asObservable();

  #sessionSubscription: ReturnType<Observable<unknown>['subscribe']> | null =
    null;

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
    this.#transportMiddleware = new LedgerMobileDMKTransportMiddleware(
      this.#sdk,
    );
  }

  /**
   * Compatibility hook for the shared LedgerBridge interface.
   * DMK session setup happens externally via updateSessionId.
   *
   * @returns A promise that resolves immediately.
   */
  async init(): Promise<void> {
    return undefined;
  }

  /**
   * Destroys the bridge and cleans up resources.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  async destroy(): Promise<void> {
    this.#sessionSubscription?.unsubscribe();
    this.#sessionSubscription = null;

    if (this.#sessionOwnership) {
      try {
        await this.#transportMiddleware.dispose();
      } catch (error) {
        console.error('Failed to dispose DMK transport middleware:', error);
      }
    }

    this.#isConnected = false;
    this.#sessionState$.next({ connected: false });
  }

  /**
   * Gets bridge options.
   *
   * @returns A promise that resolves with the current bridge options.
   */
  async getOptions(): Promise<LedgerDMKBridgeOptions> {
    return this.#opts;
  }

  /**
   * Sets bridge options.
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
    console.log('[DMK] updateSessionId - sessionId:', sessionId);
    this.#transportMiddleware.setSessionId(sessionId);
    this.#isConnected = true;
    this.#startSessionMonitoring(sessionId);
    console.log('[DMK] updateSessionId - done');
    return true;
  }

  /**
   * Starts device discovery for the configured DMK transport.
   *
   * @param args - Optional DMK discovery options.
   * @returns An observable that emits discovered devices.
   */
  startDiscovering(
    ...args: Parameters<LedgerMobileDMKTransportMiddleware['startDiscovering']>
  ): ReturnType<LedgerMobileDMKTransportMiddleware['startDiscovering']> {
    return this.#transportMiddleware.startDiscovering(...args);
  }

  /**
   * Connects to a discovered device using the configured DMK transport.
   *
   * @param args - The DMK connection arguments.
   * @returns The created session ID.
   */
  async connect(
    ...args: Parameters<LedgerMobileDMKTransportMiddleware['connect']>
  ): ReturnType<LedgerMobileDMKTransportMiddleware['connect']> {
    const sessionId = await this.#transportMiddleware.connect(...args);
    this.#isConnected = true;
    this.#startSessionMonitoring(sessionId);

    return sessionId;
  }

  /**
   * Compatibility method for the shared LedgerBridge interface.
   * DMK transport selection happens through the injected transport factory.
   *
   * @param _transportType - The requested transport type.
   * @returns `true`.
   */
  async updateTransportMethod(
    _transportType: string | Transport,
  ): Promise<boolean> {
    return true;
  }

  async openEthApp(): Promise<void> {
    console.log('[DMK] openEthApp - called');
    const sessionId = this.#transportMiddleware.getSessionId();
    console.log('[DMK] openEthApp - sessionId:', sessionId);
    try {
      const result = await this.#sdk.sendCommand({
        sessionId,
        command: new OpenAppCommand({ appName: 'Ethereum' }),
      });

      if (!isSuccessCommandResult(result)) {
        console.log('[DMK] openEthApp - failed:', result.error);
        throw this.#toError(result.error);
      }
      console.log('[DMK] openEthApp - success');
    } catch (error) {
      console.log('[DMK] openEthApp - error:', error);
      throw error;
    }
  }

  async closeApps(): Promise<void> {
    console.log('[DMK] closeApps - called');
    const sessionId = this.#transportMiddleware.getSessionId();
    try {
      const result = await this.#sdk.sendCommand({
        sessionId,
        command: new CloseAppCommand(),
      });

      if (!isSuccessCommandResult(result)) {
        console.log('[DMK] closeApps - failed:', result.error);
        throw this.#toError(result.error);
      }
      console.log('[DMK] closeApps - success');
    } catch (error) {
      console.log('[DMK] closeApps - error:', error);
      throw error;
    }
  }

  /**
   * No-op — the Ethereum signer kit automatically opens the Ethereum
   * app before each signing operation via DMK's CallTaskInAppDeviceAction.
   *
   * @returns A promise that resolves with `true`.
   */
  async attemptMakeApp(): Promise<boolean> {
    console.log('[DMK] attemptMakeApp - no-op, signer kit handles app opening');
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
    console.log('[DMK] getPublicKey - hdPath:', hdPath);
    try {
      const { observable } = this.#transportMiddleware
        .getEthSigner()
        .getAddress(this.#stripPathPrefix(hdPath), {
          checkOnDevice: false,
          returnChainCode: true,
        });
      const response =
        await this.#waitForDeviceAction<PublicKeyOutput>(observable);

      console.log('[DMK] getPublicKey - success, address:', response.address);
      return {
        publicKey: response.publicKey,
        address: response.address,
        chainCode: response.chainCode,
      };
    } catch (error) {
      console.log('[DMK] getPublicKey - error:', error);
      throw error;
    }
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
    console.log(
      '[DMK] deviceSignTransaction - hdPath:',
      hdPath,
      'tx length:',
      tx?.length,
    );
    try {
      const { observable } = this.#transportMiddleware
        .getEthSigner()
        .signTransaction(this.#stripPathPrefix(hdPath), this.#hexToBytes(tx));
      const signature = await this.#waitForDeviceAction<Signature>(observable);

      console.log('[DMK] deviceSignTransaction - success');
      return {
        v: this.#toHexString(signature.v),
        r: this.#stripHexPrefix(signature.r),
        s: this.#stripHexPrefix(signature.s),
      };
    } catch (error) {
      console.log('[DMK] deviceSignTransaction - error:', error);
      throw error;
    }
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
    console.log('[DMK] deviceSignMessage - hdPath:', hdPath);
    try {
      const { observable } = this.#transportMiddleware
        .getEthSigner()
        .signMessage(this.#stripPathPrefix(hdPath), this.#hexToBytes(message));
      const signature = await this.#waitForDeviceAction<Signature>(observable);

      console.log('[DMK] deviceSignMessage - success');
      return {
        v: signature.v,
        r: this.#stripHexPrefix(signature.r),
        s: this.#stripHexPrefix(signature.s),
      };
    } catch (error) {
      console.log('[DMK] deviceSignMessage - error:', error);
      throw error;
    }
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
    console.log('[DMK] deviceSignTypedData - hdPath:', hdPath);
    try {
      const { observable } = this.#transportMiddleware
        .getEthSigner()
        .signTypedData(this.#stripPathPrefix(hdPath), message);
      const signature = await this.#waitForDeviceAction<Signature>(observable);

      console.log('[DMK] deviceSignTypedData - success');
      return {
        v: signature.v,
        r: this.#stripHexPrefix(signature.r),
        s: this.#stripHexPrefix(signature.s),
      };
    } catch (error) {
      console.log('[DMK] deviceSignTypedData - error:', error);
      throw error;
    }
  }

  async deviceSignDelegationAuthorization({
    hdPath,
    chainId,
    contractAddress,
    nonce,
  }: LedgerSignDelegationAuthorizationParams): Promise<LedgerSignDelegationAuthorizationResponse> {
    console.log('[DMK] deviceSignDelegationAuthorization - hdPath:', hdPath);
    try {
      const { observable } = this.#transportMiddleware
        .getEthSigner()
        .signDelegationAuthorization(
          this.#stripPathPrefix(hdPath),
          chainId,
          contractAddress,
          nonce,
        );
      const signature = await this.#waitForDeviceAction<Signature>(observable);

      console.log('[DMK] deviceSignDelegationAuthorization - success');
      return {
        v: this.#toHexString(signature.v),
        r: this.#stripHexPrefix(signature.r),
        s: this.#stripHexPrefix(signature.s),
      };
    } catch (error) {
      console.log('[DMK] deviceSignDelegationAuthorization - error:', error);
      throw error;
    }
  }

  /**
   * Retrieves the current app name and version.
   *
   * @returns A promise that resolves with the app name and version.
   */
  async getAppNameAndVersion(): Promise<GetAppNameAndVersionResponse> {
    console.log('[DMK] getAppNameAndVersion - called');
    const sessionId = this.#transportMiddleware.getSessionId();
    console.log('[DMK] getAppNameAndVersion - sessionId:', sessionId);
    try {
      const command = new GetAppAndVersionCommand();
      const result = await this.#sdk.sendCommand({
        sessionId,
        command,
      });

      if (!isSuccessCommandResult(result)) {
        console.log(
          '[DMK] getAppNameAndVersion - command failed:',
          result.error,
        );
        throw this.#toError(result.error);
      }

      console.log(
        '[DMK] getAppNameAndVersion - success:',
        result.data.name,
        result.data.version,
      );
      return {
        appName: result.data.name,
        version: result.data.version,
      };
    } catch (error) {
      console.log('[DMK] getAppNameAndVersion - error:', error);
      throw error;
    }
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
    console.log('[DMK] #waitForDeviceAction - subscribing to observable');
    const state = await firstValueFrom(
      observable.pipe(
        filter(
          ({ status }) =>
            status === DeviceActionStatus.Completed ||
            status === DeviceActionStatus.Error,
        ),
      ),
    );

    console.log(
      '[DMK] #waitForDeviceAction - state received, status:',
      state.status,
    );
    if (state.status === DeviceActionStatus.Completed) {
      return state.output;
    }

    if (state.status === DeviceActionStatus.Error) {
      console.log(
        '[DMK] #waitForDeviceAction - error state:',
        JSON.stringify({
          errorType: typeof state.error,
          errorConstructor: state.error?.constructor?.name,
          errorMessage:
            state.error instanceof Error
              ? state.error.message
              : String(state.error),
          errorTag: (state.error as { _tag?: string })?._tag,
          errorCode: (state.error as { errorCode?: string })?.errorCode,
          errorKeys:
            state.error && typeof state.error === 'object'
              ? Object.keys(state.error)
              : undefined,
        }),
      );
      throw translateDmkError(state.error);
    }

    throw new Error('Ledger device action ended without completion.');
  }

  #stripHexPrefix(value: string): string {
    return value.startsWith('0x') ? value.slice(2) : value;
  }

  #stripPathPrefix(path: string): string {
    return path.replace(/^m\//u, '');
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

  #toHexString(value: bigint | number | string): string {
    if (typeof value === 'string') {
      return this.#stripHexPrefix(value);
    }

    return value.toString(16);
  }

  #hexToBytes(value: string): Uint8Array {
    const normalizedValue = this.#stripHexPrefix(value);
    const bytes = normalizedValue
      .match(/.{1,2}/gu)
      ?.map((byte) => parseInt(byte, 16));

    return Uint8Array.from(bytes ?? []);
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

export type MobileLedgerBridge<
  TOptions extends LedgerBridgeOptions = LedgerDMKBridgeOptions,
> = LedgerBridge<TOptions> & {
  openEthApp(): Promise<void>;
  closeApps(): Promise<void>;
  updateSessionId(sessionId: string): Promise<boolean>;
  onSessionStateChange: Observable<{ connected: boolean }>;
  readonly dmk: DeviceManagementKit;
};

/**
 * @deprecated Use {@link LedgerDMKBridge} instead. This alias will be removed
 * in a future major version.
 */
export const LedgerMobileDMKBridge = LedgerDMKBridge;
