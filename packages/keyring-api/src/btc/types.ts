import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { string, array, enums, size } from '@metamask/superstruct';

import {
  BtcAccountType,
  KeyringAccountStruct,
  CaipChainIdStruct,
} from '../api';

/**
 * Supported Bitcoin methods.
 */
export enum BtcMethod {
  // General transaction methods
  SendBitcoin = 'sendBitcoin',
}

export const BtcAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: string(),

  /**
   * Account type.
   */
  type: enums(Object.values(BtcAccountType)),

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

export type BtcP2wpkhAccount = Infer<typeof BtcAccountStruct>;
