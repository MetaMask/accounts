import type LedgerHwAppEth from '@ledgerhq/hw-app-eth';
import type Transport from '@ledgerhq/hw-transport';
import type { EIP712Message } from '@ledgerhq/types-live';

export type GetPublicKeyParams = { hdPath: string };
export type GetPublicKeyResponse = Awaited<
  ReturnType<LedgerHwAppEth['getAddress']>
>;

export type LedgerSignTransactionParams = { hdPath: string; tx: string };
export type LedgerSignTransactionResponse = Awaited<
  ReturnType<LedgerHwAppEth['signTransaction']>
>;

export type LedgerSignMessageParams = { hdPath: string; message: string };
export type LedgerSignMessageResponse = Awaited<
  ReturnType<LedgerHwAppEth['signPersonalMessage']>
>;

export type LedgerSignTypedDataParams = {
  hdPath: string;
  message: EIP712Message;
};
export type LedgerSignTypedDataResponse = Awaited<
  ReturnType<LedgerHwAppEth['signEIP712HashedMessage']>
>;

export type GetAppNameAndVersionResponse = {
  appName: string;
  version: string;
};

export type AppConfigurationResponse = {
  arbitraryDataEnabled: number; // this is the blind signing support
  erc20ProvisioningNecessary: number;
  starkEnabled: number;
  starkv2Supported: number;
  version: string;
};

export type LedgerBridgeOptions = Record<string, unknown>;

export type LedgerBridge<T extends LedgerBridgeOptions> = {
  isDeviceConnected: boolean;

  init(): Promise<void>;

  destroy(): Promise<void>;

  /**
   * Method to get the current configuration of the ledger bridge keyring.
   */
  getOptions(): Promise<T>;

  /**
   * Method to set the current configuration of the ledger bridge keyring.
   *
   * @param opts - An object contains configuration of the bridge.
   */
  setOptions(opts: T): Promise<void>;

  attemptMakeApp(): Promise<boolean>;

  updateTransportMethod(transportType: string | Transport): Promise<boolean>;

  getPublicKey(params: GetPublicKeyParams): Promise<GetPublicKeyResponse>;

  deviceSignTransaction(
    params: LedgerSignTransactionParams,
  ): Promise<LedgerSignTransactionResponse>;

  deviceSignMessage(
    params: LedgerSignMessageParams,
  ): Promise<LedgerSignMessageResponse>;

  deviceSignTypedData(
    params: LedgerSignTypedDataParams,
  ): Promise<LedgerSignTypedDataResponse>;

  /**
   * Method to retrieve the name and version of the running application on the Ledger device.
   *
   * @returns An object containing appName and version.
   */
  getAppNameAndVersion(): Promise<GetAppNameAndVersionResponse>;

  /**
   * Method to retrieve the configuration of the running application on the Ledger device.
   *
   * @returns An object containing the configuration of the running application.
   */
  getAppConfiguration(): Promise<AppConfigurationResponse>;
};
