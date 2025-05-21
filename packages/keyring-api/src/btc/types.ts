import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  string,
  array,
  enums,
  refine,
  literal,
  nonempty,
} from '@metamask/superstruct';
import { AddressType, getAddressInfo } from 'bitcoin-address-validation';

import {
  BtcAccountType,
  CaipChainIdStruct,
  KeyringAccountStruct,
} from '../api';

const validateAddress = (
  address: string,
  type: AddressType,
): boolean | Error => {
  try {
    const addressInfo = getAddressInfo(address);
    if (addressInfo.type === type) {
      return true;
    }
    return new Error(`Invalid ${type} address`);
  } catch (error) {
    return new Error(
      `Failed to decode ${type} address: ${(error as Error).message}`,
    );
  }
};

export const BtcP2pkhAddressStruct = refine(
  string(),
  'BtcP2pkhAddressStruct',
  (address: string) => {
    return validateAddress(address, AddressType.p2pkh);
  },
);

export const BtcP2shAddressStruct = refine(
  string(),
  'BtcP2shAddressStruct',
  (address: string) => {
    return validateAddress(address, AddressType.p2sh);
  },
);

export const BtcP2wpkhAddressStruct = refine(
  string(),
  'BtcP2wpkhAddressStruct',
  (address: string) => {
    return validateAddress(address, AddressType.p2wpkh);
  },
);

export const BtcP2trAddressStruct = refine(
  string(),
  'BtcP2trAddressStruct',
  (address: string) => {
    return validateAddress(address, AddressType.p2tr);
  },
);

/**
 * Supported Bitcoin methods.
 */
export enum BtcMethod {
  // General transaction methods
  SendBitcoin = 'sendBitcoin',
}

const BtcAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account supported scopes (CAIP-2 chain ID).
   */
  scopes: nonempty(array(CaipChainIdStruct)),

  /**
   * Account supported methods.
   */
  methods: array(enums([`${BtcMethod.SendBitcoin}`])),
});

export const BtcP2pkhAccountStruct = object({
  ...BtcAccountStruct.schema,

  /**
   * Account P2PKH address.
   */
  address: BtcP2pkhAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${BtcAccountType.P2pkh}`),
});

export const BtcP2shAccountStruct = object({
  ...BtcAccountStruct.schema,

  /**
   * Account P2SH address.
   */
  address: BtcP2shAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${BtcAccountType.P2sh}`),
});

export const BtcP2wpkhAccountStruct = object({
  ...BtcAccountStruct.schema,

  /**
   * Account P2WPKH address.
   */
  address: BtcP2wpkhAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${BtcAccountType.P2wpkh}`),
});

export const BtcP2trAccountStruct = object({
  ...BtcAccountStruct.schema,

  /**
   * Account P2TR address.
   */
  address: BtcP2trAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${BtcAccountType.P2tr}`),
});

export type BtcP2pkhAccount = Infer<typeof BtcP2pkhAccountStruct>;
export type BtcP2shAccount = Infer<typeof BtcP2shAccountStruct>;
export type BtcP2wpkhAccount = Infer<typeof BtcP2wpkhAccountStruct>;
export type BtcP2trAccount = Infer<typeof BtcP2trAccountStruct>;
