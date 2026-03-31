import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, literal, nonempty } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';

import {
  CaipChainIdStruct,
  KeyringAccountStruct,
  XlmAccountType,
} from '../api';

/**
 * Stellar account addresses use strkey encoding: non-muxed accounts start with `G`
 * and are 56 characters long.
 */
export const XlmAddressStruct = definePattern('XlmAddress', /^G[A-Z2-7]{55}$/u);

/**
 * Supported Stellar methods.
 */
export enum XlmMethod {
  SignMessage = 'signMessage',
  SignTransaction = 'signTransaction',
}

export const XlmAccountStruct = object({
  ...KeyringAccountStruct.schema,
  /**
   * Account address.
   */
  address: XlmAddressStruct,
  /**
   * Account type.
   */
  type: literal(`${XlmAccountType.Account}`),
  /**
   * Account supported scopes (CAIP-2 chain IDs).
   */
  scopes: nonempty(array(CaipChainIdStruct)),
  /**
   * Account supported methods.
   */
  methods: array(enums(Object.values(XlmMethod))),
});

export type XlmAccount = Infer<typeof XlmAccountStruct>;
