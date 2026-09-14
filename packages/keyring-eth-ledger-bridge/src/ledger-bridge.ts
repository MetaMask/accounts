import type { EIP712Message } from '@ledgerhq/types-live';

export type GetPublicKeyParams = { hdPath: string };
export type GetPublicKeyResponse = {
  publicKey: string;
  address: string;
  chainCode?: string;
};

export type LedgerSignTransactionParams = { hdPath: string; tx: string };
export type LedgerSignTransactionResponse = { r: string; v: string; s: string };

export type LedgerSignMessageParams = { hdPath: string; message: string };
export type LedgerSignMessageResponse = { v: number; r: string; s: string };

export type LedgerSignTypedDataParams = {
  hdPath: string;
  message: EIP712Message;
};
export type LedgerSignTypedDataResponse = { v: number; r: string; s: string };

export type LedgerSignDelegationAuthorizationParams = {
  hdPath: string;
  chainId: number;
  contractAddress: string;
  nonce: number;
};

// TODO: Replace with 7702 return type
export type LedgerSignDelegationAuthorizationResponse = Awaited<{
  s: string;
  v: string;
  r: string;
}>;

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

  updateTransportMethod(transportType: string | unknown): Promise<boolean>;

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

  deviceSignDelegationAuthorization(
    params: LedgerSignDelegationAuthorizationParams,
  ): Promise<LedgerSignDelegationAuthorizationResponse>;

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
