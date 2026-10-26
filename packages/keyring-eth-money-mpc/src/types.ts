import type { EthKeyring } from '@metamask/keyring-utils';
import type { CL24DKM, CL24ThresholdKey } from '@metamask/mfa-wallet-cl24';
import type { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23';
import type { CentrifugeIdentity } from '@metamask/mfa-wallet-network';
import type { MfaWhitelistConfig } from '@metamask/money-account-mfa-whitelist';
import type { Json } from '@metamask/utils';

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
   * Pinned whitelist configuration for the current signature.
   *
   * When this is omitted or throws, every signature requires MFA.
   */
  getMfaWhitelistConfig?: () => Promise<MfaWhitelistConfig>;
  getBackupEncryptionKey: () => Promise<Uint8Array>;
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
