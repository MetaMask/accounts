import { AccountIdStruct, object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { nonempty, array, enums, record, string } from '@metamask/superstruct';
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
  P2wpkh = 'bip122:p2wpkh',
}

/**
 * Supported Solana account types.
 */
export enum SolAccountType {
  DataAccount = 'solana:data-account',
}

/**
 * Supported account types.
 */
export type KeyringAccountType =
  | `${EthAccountType.Eoa}`
  | `${EthAccountType.Erc4337}`
  | `${BtcAccountType.P2wpkh}`
  | `${SolAccountType.DataAccount}`;

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
    `${BtcAccountType.P2wpkh}`,
    `${SolAccountType.DataAccount}`,
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
