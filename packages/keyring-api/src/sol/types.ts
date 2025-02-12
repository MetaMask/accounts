import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, literal, nonempty } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

import {
  CaipChainIdStruct,
  KeyringAccountStruct,
  SolAccountType,
} from '../api';

/**
 * Solana addresses are represented in the format of a 256-bit ed25519 public key and
 * are encoded using base58.
 * They are usually 32 to 44 characters long.
 */
export const SolAddressStruct = definePattern(
  'SolAddress',
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/iu,
);

/**
 * Supported Solana methods.
 */
export enum SolMethod {
  // General transaction methods
  SendAndConfirmTransaction = 'sendAndConfirmTransaction',
}

export const SolDataAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: SolAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${SolAccountType.DataAccount}`),

  /**
   * Account supported scopes (CAIP-2 chain IDs).
   */
  scopes: nonempty(array(CaipChainIdStruct)),

  /**
   * Account supported methods.
   */
  methods: array(enums([`${SolMethod.SendAndConfirmTransaction}`])),
});

export type SolDataAccount = Infer<typeof SolDataAccountStruct>;
