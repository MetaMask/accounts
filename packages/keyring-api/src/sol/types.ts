import type { Infer } from '@metamask/superstruct';
import { array, enums, literal } from '@metamask/superstruct';

import { KeyringAccountStruct, SolAccountType } from '../api';
import { object, definePattern } from '../superstruct';

/**
 * Solana addresses are encoded using Base58
 * Represented as 32 bytes in the format of an Ed25519 PublicKey
 * And a valid Solana address is 44 characters long
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

export const SolEoaAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: SolAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${SolAccountType.Eoa}`),

  /**
   * Account supported methods.
   */
  methods: array(enums([`${SolMethod.SendAndConfirmTransaction}`])),
});

export type SolEoaAccount = Infer<typeof SolEoaAccountStruct>;
