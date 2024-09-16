import type { Infer } from '@metamask/superstruct';
import { array, enums, literal } from '@metamask/superstruct';

import { EthAccountType, KeyringAccountStruct } from '../api';
import { object, definePattern } from '../superstruct';

export const EthBytesStruct = definePattern('EthBytes', /^0x[0-9a-f]*$/iu);

export const EthAddressStruct = definePattern(
  'EthAddress',
  /^0x[0-9a-f]{40}$/iu,
);

export const EthUint256Struct = definePattern(
  'EthUint256',
  /^0x([1-9a-f][0-9a-f]*|0)$/iu,
);

/**
 * Supported Ethereum methods.
 */
export enum EthMethod {
  // General signing methods
  PersonalSign = 'personal_sign',
  Sign = 'eth_sign',
  SignTransaction = 'eth_signTransaction',
  SignTypedDataV1 = 'eth_signTypedData_v1',
  SignTypedDataV3 = 'eth_signTypedData_v3',
  SignTypedDataV4 = 'eth_signTypedData_v4',
  // ERC-4337 methods
  PrepareUserOperation = 'eth_prepareUserOperation',
  PatchUserOperation = 'eth_patchUserOperation',
  SignUserOperation = 'eth_signUserOperation',
}

export const EthEoaAccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: EthAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${EthAccountType.Eoa}`),

  /**
   * Account supported methods.
   */
  methods: array(
    enums([
      `${EthMethod.PersonalSign}`,
      `${EthMethod.Sign}`,
      `${EthMethod.SignTransaction}`,
      `${EthMethod.SignTypedDataV1}`,
      `${EthMethod.SignTypedDataV3}`,
      `${EthMethod.SignTypedDataV4}`,
    ]),
  ),
});

export type EthEoaAccount = Infer<typeof EthEoaAccountStruct>;

export const EthErc4337AccountStruct = object({
  ...KeyringAccountStruct.schema,

  /**
   * Account address.
   */
  address: EthAddressStruct,

  /**
   * Account type.
   */
  type: literal(`${EthAccountType.Erc4337}`),

  /**
   * Account supported methods.
   */
  methods: array(
    enums([
      `${EthMethod.PersonalSign}`,
      `${EthMethod.Sign}`,
      `${EthMethod.SignTypedDataV1}`,
      `${EthMethod.SignTypedDataV3}`,
      `${EthMethod.SignTypedDataV4}`,
      `${EthMethod.PrepareUserOperation}`,
      `${EthMethod.PatchUserOperation}`,
      `${EthMethod.SignUserOperation}`,
    ]),
  ),
});

export type EthErc4337Account = Infer<typeof EthErc4337AccountStruct>;
