import { AccountIdStruct, object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, nonempty, record, string } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { CaipChainIdStruct } from './caip';

/**
 * Supported Ethereum account types.
 */
export enum EthAccountType {
  Eoa = 'eip155:eoa',
  Erc4337 = 'eip155:erc4337',
}

/**
 * Supported Bitcoin account types.
 */
export enum BtcAccountType {
  P2pkh = 'bip122:p2pkh',
  P2sh = 'bip122:p2sh',
  P2wpkh = 'bip122:p2wpkh',
  P2tr = 'bip122:p2tr',
}

/**
 * Supported Solana account types.
 */
export enum SolAccountType {
  DataAccount = 'solana:data-account',
}

/**
 * Supported Tron account types.
 */
export enum TronAccountType {
  DataAccount = 'tron:data-account',
}

/**
 * Supported account types.
 */
export type KeyringAccountType =
  | `${EthAccountType.Eoa}`
  | `${EthAccountType.Erc4337}`
  | `${BtcAccountType.P2pkh}`
  | `${BtcAccountType.P2sh}`
  | `${BtcAccountType.P2wpkh}`
  | `${BtcAccountType.P2tr}`
  | `${SolAccountType.DataAccount}`
  | `${TronAccountType.DataAccount}`;

/**
 * A struct which represents a Keyring account object. It is abstract enough to
 * be used with any blockchain. Specific blockchain account types should extend
 * this struct.
 *
 * See {@link KeyringAccount}.
 */
export const KeyringAccountStruct = object({
  /**
   * Account ID (UUIDv4).
   */
  id: AccountIdStruct,

  /**
   * Account type.
   */
  type: enums([
    `${EthAccountType.Eoa}`,
    `${EthAccountType.Erc4337}`,
    `${BtcAccountType.P2pkh}`,
    `${BtcAccountType.P2sh}`,
    `${BtcAccountType.P2wpkh}`,
    `${BtcAccountType.P2tr}`,
    `${SolAccountType.DataAccount}`,
    `${TronAccountType.DataAccount}`,
  ]),

  /**
   * Account main address.
   */
  address: string(),

  /**
   * Account supported scopes (CAIP-2 chain IDs).
   */
  scopes: nonempty(array(CaipChainIdStruct)),

  /**
   * Account options.
   */
  options: record(string(), JsonStruct),

  /**
   * Account supported methods.
   */
  methods: array(string()),
});

/**
 * Keyring Account type represents an account and its properties from the
 * point of view of the keyring.
 */
export type KeyringAccount = Infer<typeof KeyringAccountStruct>;
