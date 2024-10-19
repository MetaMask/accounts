import { string, array, enums, refine, literal } from '@metamask/superstruct';
import { bech32 } from 'bech32';

import type { KeyringAccount } from '../api';
import { KeyringAccountStruct, BtcAccountType } from '../api';
import type { InferExtends } from '../superstruct';
import { object } from '../superstruct';

export const BtcP2wpkhAddressStruct = refine(
  string(),
  'BtcP2wpkhAddressStruct',
  (address: string) => {
    try {
      bech32.decode(address);
    } catch (error) {
      return new Error(
        `Could not decode P2WPKH address: ${(error as Error).message}`,
      );
    }
    return true;
  },
);

/**
 * Supported Bitcoin methods.
 */
export enum BtcMethod {
  // General transaction methods
  SendBitcoin = 'sendBitcoin',
}

export const BtcP2wpkhAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: BtcP2wpkhAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${BtcAccountType.P2wpkh}`),

  /**
   * Account supported methods.
   */
  methods: array(enums([`${BtcMethod.SendBitcoin}`])),
});

export type BtcP2wpkhAccount = InferExtends<
  typeof BtcP2wpkhAccountStruct,
  KeyringAccount
>;
