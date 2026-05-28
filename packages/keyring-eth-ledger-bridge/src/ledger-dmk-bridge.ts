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

  #sessionOwnership: boolean;

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
   * Verifies the Ethereum app is running on the connected device.
   *
   * @returns A promise that resolves with true when the Ethereum app is running.
   * @throws If a non-Ethereum app is running or the app check fails.
   */
  async attemptMakeApp(): Promise<boolean> {
    const { appName } = await this.getAppNameAndVersion();

    if (appName !== 'Ethereum') {
      throw new Error(`Expected Ethereum app but '${appName}' is running`);
    }

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
      .getAddress(hdPath, {
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
      .signTransaction(hdPath, this.#hexToBytes(tx));
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: this.#toHexString(signature.v),
      r: this.#stripHexPrefix(signature.r),
      s: this.#stripHexPrefix(signature.s),
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
      .signMessage(hdPath, message);
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: signature.v,
      r: this.#stripHexPrefix(signature.r),
      s: this.#stripHexPrefix(signature.s),
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
      .signTypedData(hdPath, message);
    const signature = await this.#waitForDeviceAction<Signature>(observable);

    return {
      v: signature.v,
      r: this.#stripHexPrefix(signature.r),
      s: this.#stripHexPrefix(signature.s),
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

    throw new Error('Ledger device action ended without completion.');
  }

  #stripHexPrefix(value: string): string {
    return value.startsWith('0x') ? value.slice(2) : value;
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
  T extends LedgerBridgeOptions = LedgerDMKBridgeOptions,
> = LedgerBridge<T> & {
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
