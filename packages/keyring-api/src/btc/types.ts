import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  string,
  array,
  enums,
  refine,
  literal,
  size,
} from '@metamask/superstruct';
import { bech32 } from 'bech32';

import {
  BtcAccountType,
  KeyringAccountStruct,
  CaipChainIdStruct,
} from '../api';

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
   * Account supported scope (CAIP-2 chain ID).
   *
   * NOTE: We consider a Bitcoin address to be valid on only 1 network at time.
   */
  scopes: size(array(CaipChainIdStruct), 1),

  /**
   * Account supported methods.
   */
  methods: array(enums([`${BtcMethod.SendBitcoin}`])),
});

export type BtcP2wpkhAccount = Infer<typeof BtcP2wpkhAccountStruct>;
