import type { Infer } from '@metamask/superstruct';
import { string, array, enums, refine, literal } from '@metamask/superstruct';
import { bech32 } from 'bech32';

import { KeyringAccountStruct, BtcAccountType } from '../api';
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
  SendMany = 'btc_sendmany',
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
  methods: array(enums([`${BtcMethod.SendMany}`])),
});

export type BtcP2wpkhAccount = Infer<typeof BtcP2wpkhAccountStruct>;
