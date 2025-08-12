import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, literal, nonempty, record } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

import {
  CaipChainIdStruct,
  KeyringAccountStruct,
  SolAccountType,
  TrxAccountType,
} from '../api';

/**
 * TRON addresses are Base58-encoded strings that are exactly 34 characters long
 * and start with the letter 'T'.
 */
export const TrxAddressStruct = definePattern(
  'TrxAddress',
  /^T[1-9A-HJ-NP-Za-km-z]{33}$/iu,
);

/**
 * Supported TRON methods.
 */
export declare enum TrxMethod {
  SignMessageV2 = "signMessageV2",
  VerifyMessageV2 = "verifyMessageV2"
}

export const TrxEoaAccountStruct = object({
    ...KeyringAccountStruct.schema,
    /**
     * Account address.
     */
    address: TrxAddressStruct,
    /**
     * Account type.
     */
    type: literal(`${TrxAccountType.Eoa}`),
    /**
     * Account supported scopes (CAIP-2 chain IDs).
     */
    scopes: nonempty(array(CaipChainIdStruct)),
    /**
     * Account supported methods.
     */
    methods: array(enums(Object.values(TrxMethod))),
});

export type TrxEoaAccount = Infer<typeof TrxEoaAccountStruct>;
