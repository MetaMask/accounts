import {
  DeviceActionStatus,
  type DeviceActionState,
  type DeviceManagementKit,
  DeviceManagementKitBuilder,
  GetAppAndVersionCommand,
  isSuccessCommandResult,
} from '@ledgerhq/device-management-kit';
import type {
  Signature,
  TypedData,
} from '@ledgerhq/device-signer-kit-ethereum';
import type { Observable } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { filter } from 'rxjs/operators';

import {
  AppConfigurationResponse,
  GetAppNameAndVersionResponse,
  GetPublicKeyParams,
  GetPublicKeyResponse,
  LedgerBridge,
  LedgerSignMessageParams,
  LedgerSignMessageResponse,
  LedgerSignTransactionParams,
  LedgerSignTransactionResponse,
  LedgerSignTypedDataParams,
  LedgerSignTypedDataResponse,
} from './ledger-bridge';
import { LedgerDMKTransportMiddleware } from './ledger-dmk-transport-middleware';

export type LedgerDMKBridgeOptions = Record<string, unknown>;

type PublicKeyOutput = Pick<
  GetPublicKeyResponse,
  'address' | 'chainCode' | 'publicKey'
>;

/**
 * LedgerDMKBridge is a bridge between the LedgerKeyring and the LedgerDMKTransportMiddleware.
 * It initializes and manages the DeviceManagementKit internally.
 */
export class LedgerDMKBridge implements LedgerBridge<LedgerDMKBridgeOptions> {
  readonly #transportMiddleware: LedgerDMKTransportMiddleware;

  readonly #sdk: DeviceManagementKit;

  #opts: LedgerDMKBridgeOptions;

  isDeviceConnected = false;

  constructor(opts: LedgerDMKBridgeOptions = {}) {
    this.#opts = opts;
    this.#sdk = new DeviceManagementKitBuilder().build();
    this.#transportMiddleware = new LedgerDMKTransportMiddleware(this.#sdk);
  }

  /**
   * Initializes the bridge.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  async init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Destroys the bridge and cleans up resources.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  async destroy(): Promise<void> {
    try {
      await this.#transportMiddleware.dispose();
    } catch (error) {
      console.error('Failed to dispose DMK transport middleware:', error);
    }
    this.isDeviceConnected = false;
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
    this.isDeviceConnected = true;
    return true;
  }

  /**
   * Compatibility method for LedgerBridge interface.
   * This method is not supported in DMK bridge - use updateSessionId instead.
   *
   * @throws Error indicating this method is not supported.
   */
  async updateTransportMethod(): Promise<boolean> {
    throw new Error(
      'updateTransportMethod is not supported in DMK bridge. Use updateSessionId instead.',
    );
  }

  /**
   * Compatibility method for app initialization.
   *
   * @returns A promise that resolves with true indicating the app is ready.
   */
  async attemptMakeApp(): Promise<boolean> {
    return Promise.resolve(true); // SignerEth handles app check
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
    const response = await this.#waitForDeviceAction<PublicKeyOutput>(
      observable as Observable<
        DeviceActionState<PublicKeyOutput, Error, unknown>
      >,
    );

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
      .signTransaction(hdPath, Uint8Array.from(Buffer.from(tx, 'hex')));
    const signature = await this.#waitForDeviceAction<Signature>(
      observable as Observable<DeviceActionState<Signature, Error, unknown>>,
    );

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
    const signature = await this.#waitForDeviceAction<Signature>(
      observable as Observable<DeviceActionState<Signature, Error, unknown>>,
    );

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
      .signTypedData(hdPath, message as TypedData);
    const signature = await this.#waitForDeviceAction<Signature>(
      observable as Observable<DeviceActionState<Signature, Error, unknown>>,
    );

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
   * Retrieves the Ethereum app configuration.
   *
   * @returns A promise that resolves with the app configuration.
   */
  async getAppConfiguration(): Promise<AppConfigurationResponse> {
    const sessionId = this.#transportMiddleware.getSessionId();
    const command = new GetAppAndVersionCommand();
    const result = await this.#sdk.sendCommand({
      sessionId,
      command,
    });

    if (!isSuccessCommandResult(result)) {
      throw this.#toError(result.error);
    }

    const { data } = result;

    // Parse flags if available to determine app capabilities
    // Flags are bit-encoded: bit 0 = arbitrary data (blind signing) support
    const flags = data.flags ?? 0;
    // eslint-disable-next-line no-bitwise
    const arbitraryDataEnabled = typeof flags === 'number' ? flags & 0x01 : 1;

    return {
      arbitraryDataEnabled,
      erc20ProvisioningNecessary: 0,
      starkEnabled: 0,
      starkv2Supported: 0,
      version: data.version,
    };
  }

  async #waitForDeviceAction<TOutput>(
    observable: Observable<DeviceActionState<TOutput, Error, unknown>>,
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
      throw state.error;
    }

    throw new Error('Ledger device action ended without completion.');
  }

  #stripHexPrefix(value: string): string {
    return value.startsWith('0x') ? value.slice(2) : value;
  }

  #toError(error: unknown): Error {
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
}
