// Local interface for @ledgerhq/hw-app-eth Eth class.
//
// The package has no `exports` field, so TypeScript 7 + Node16 ESM cannot
// resolve its class type through any import form. We duplicate only the
// members we use and pin them to the installed version. The typing test in
// ledger-hw-app.test-d.ts verifies structural compatibility against the real
// class.

import { Buffer } from 'buffer';

type EIP712MessageDomain = Partial<{
  name: string;
  chainId: number;
  version: string;
  verifyingContract: string;
  salt: string;
}>;

type EIP712MessageTypesEntry = { name: string; type: string };

type EIP712Message = {
  domain: EIP712MessageDomain;
  types: {
    EIP712Domain: EIP712MessageTypesEntry[];
    [key: string]: EIP712MessageTypesEntry[];
  };
  primaryType: string;
  message: Record<string, unknown>;
};

type LedgerEthTransactionResolution = {
  erc20Tokens: string[];
  nfts: string[];
  externalPlugin: Array<{ payload: string; signature: string }>;
  plugin: string[];
  domains: Array<{ registry: string; address: string }>;
};

type ResolutionConfig = {
  nft?: boolean;
  externalPlugins?: boolean;
  erc20?: boolean;
  domains?: Array<{ registry: string; address: string }>;
  uniswapV3?: boolean;
};

export type LedgerHwAppEthInterface = {
  transport: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: (...args: any[]) => Promise<Buffer>;
    close: () => Promise<void>;
  };
  getAddress(
    path: string,
    boolDisplay?: boolean,
    boolChaincode?: boolean,
    chainId?: string,
  ): Promise<{ publicKey: string; address: string; chainCode?: string }>;
  signTransaction(
    path: string,
    rawTxHex: string,
    resolution?: LedgerEthTransactionResolution | null,
  ): Promise<{ s: string; v: string; r: string }>;
  clearSignTransaction(
    path: string,
    rawTxHex: string,
    resolutionConfig: ResolutionConfig,
    throwOnError?: boolean,
  ): Promise<{ r: string; s: string; v: string }>;
  getAppConfiguration(): Promise<{
    arbitraryDataEnabled: number;
    erc20ProvisioningNecessary: number;
    starkEnabled: number;
    starkv2Supported: number;
    version: string;
  }>;
  signPersonalMessage(
    path: string,
    messageHex: string,
  ): Promise<{ v: number; s: string; r: string }>;
  signEIP712Message(
    path: string,
    jsonMessage: EIP712Message,
    fullImplem?: boolean,
  ): Promise<{ v: number; s: string; r: string }>;
};
