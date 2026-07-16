import type { Infer } from '@metamask/superstruct';
import { nonempty, array, enums, literal, object } from '@metamask/superstruct';
import { definePattern } from '@metamask/utils';
import type { Hex } from '@metamask/utils';

import { EthScope } from '.';
import { EthAccountType, KeyringAccountStruct } from '../api';

const ETH_BYTES_REGEX = /^0x[0-9a-f]*$/iu;
export const EthBytesStruct = definePattern('EthBytes', ETH_BYTES_REGEX);
// Stricter struct that uses `Hex` as final type.
export const EthBytesStrictStruct = definePattern<Hex>(
  'EthBytesStrict',
  ETH_BYTES_REGEX,
);

const ETH_ADDRESS_REGEX = /^0x[0-9a-f]{40}$/iu;
export const EthAddressStruct = definePattern('EthAddress', ETH_ADDRESS_REGEX);
// Stricter struct that uses `Hex` as final type.
export const EthAddressStrictStruct = definePattern<Hex>(
  'EthAddressStrict',
  ETH_ADDRESS_REGEX,
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
   * Account scopes (must be ['eip155:0']).
   */
  scopes: nonempty(array(literal(EthScope.Eoa))),

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
