import type { EthKeyring } from '@metamask/keyring-utils';
import type { CL24DKM, CL24ThresholdKey } from '@metamask/mfa-wallet-cl24';
import type { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23';
import type { CentrifugeIdentity } from '@metamask/mfa-wallet-network';
import type { Hex, Json } from '@metamask/utils';

export type ProfileTokenOpts = {
  twoFactor?: boolean;
  challenge?: Uint8Array;
};

/**
 * `/sign` response code when the backend still requires MFA.
 *
 * The keyring requests a 2FA token and retries `/sign` once when it receives
 * this. A second response means the profile token still has no second factor,
 * so signing fails and no session is opened.
 */
export const MFA_REQUIRED_CODE = 'mfa_required' as const;

/**
 * An EIP-7702 authorization tuple, as passed to `signEip7702Authorization`.
 */
export type Eip7702Authorization = [
  chainId: number,
  contractAddress: Hex,
  nonce: number,
];

/**
 * A signature request sent to `/sign`, mirroring the keyring's signing methods.
 *
 * The backend uses this to decide whether the signature requires MFA.
 */
export type MoneyAccountSignatureRequest =
  | {
      method: 'signPersonalMessage';
      /** The Money Account address. */
      address: Hex;
      /** The message as hex-encoded UTF-8, as passed to the keyring. */
      message: Hex;
    }
  | {
      method: 'signTypedData';
      /** The Money Account address. */
      address: Hex;
      version: 'V1' | 'V3' | 'V4';
      /** The typed data, as an object or as a JSON string. */
      data: unknown;
    }
  | {
      method: 'signEip7702Authorization';
      /** The Money Account address. */
      address: Hex;
      authorization: Eip7702Authorization;
    };

export type Cl24Lib = ConstructorParameters<typeof CL24DKM>[0];
export type Dkls23Lib = ConstructorParameters<typeof Dkls23TssLib>[0];

export type MpcMoneyKeyringOpts = {
  cl24Lib: Cl24Lib;
  dkls23Lib: Dkls23Lib;
  cloudURL: string;
  relayerURL: string;
  getTransportToken?: () => Promise<string>;
  getProfileToken: (opts?: ProfileTokenOpts) => Promise<string>;
  /**
   * Resolve the wallet's primary mnemonic as UTF-8 byte values, not packed word
   * indices. Recovery requires the same mnemonic used to encrypt the backup.
   */
  getPrimaryMnemonic: () => Promise<number[]>;
  webSocket?: unknown;
};

export type MpcMoneyKeyringState = {
  keyShare: CL24ThresholdKey;
  shareEpoch: number;
  netCreds: CentrifugeIdentity;
  serverNetId: string;
  tssSetup: Uint8Array | null;
};

type JsonSerializer<Value> = {
  toJson: (value: Value) => Json;
  fromJson: (value: Json) => Value;
};

export type MpcMoneyKeyringInitializedState = {
  status: 'initialized';
} & MpcMoneyKeyringState;

export type MpcMoneyKeyringSerializer = {
  thresholdKey: JsonSerializer<CL24ThresholdKey>;
  networkIdentity: JsonSerializer<CentrifugeIdentity>;
};

/**
 * The MPC money keyring contract implemented by the V1 keyring class and consumed
 * by the V2 adapter.
 */
export type MpcMoneyKeyring = EthKeyring & {
  /**
   * Run key generation or import.
   *
   * The mode is inferred from the backend: import when a key share or
   * backup exists for the profile, create otherwise.
   */
  setup(): Promise<void>;

  /**
   * Rotate the MPC key shares.
   */
  rotateKeyShares(): Promise<void>;

  /**
   * Check the MPC key share state.
   *
   * @returns Whether the key share is up to date.
   */
  checkKeyShare(): Promise<boolean>;

  /**
   * Synchronize the MPC key share.
   */
  syncKeyShare(): Promise<void>;
};
