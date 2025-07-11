import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, literal, nonempty } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

import {
  CaipChainIdStruct,
  KeyringAccountStruct,
  TronAccountType,
} from '../api';

/**
 * TRON addresses are Base58-encoded strings that are exactly 34 characters long
 * and start with the letter 'T'.
 * Mainnet addresses begin with 'T'.
 */
export const TronAddressStruct = definePattern(
  'TronAddress',
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/iu,
);

/**
 * Supported TRON methods.
 */
export enum TronMethod {
  SignMessageV2 = 'signMessageV2',
  VerifyMessageV2 = 'verifyMessageV2',
}

export const TronDataAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: TronAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${TronAccountType.DataAccount}`),

  /**
   * Account supported scopes (CAIP-2 chain IDs).
   */
  scopes: nonempty(array(CaipChainIdStruct)),

  /**
   * Account supported methods.
   */
  methods: array(enums(Object.values(TronMethod))),
});

export type TronDataAccount = Infer<typeof TronDataAccountStruct>;
