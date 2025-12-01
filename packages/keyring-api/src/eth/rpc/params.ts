/**
 * Superstruct validation schemas for Ethereum JSON-RPC method parameters.
 *
 * These structs provide runtime validation for the parameters passed to various
 * Ethereum RPC methods. They can be used by keyring implementations to validate
 * incoming requests before processing.
 */

import { object } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  any,
  array,
  literal,
  nullable,
  number,
  optional,
  record,
  string,
  tuple,
  type,
  union,
} from '@metamask/superstruct';

import { EthAddressStruct, EthBytesStruct } from '../types';

/**
 * A struct for validating Ethereum transaction data.
 *
 * This uses `type()` instead of `object()` to allow extra properties,
 * since transaction formats can vary and include additional fields.
 * The actual transaction validation is performed by the transaction library.
 */
export const EthTransactionDataStruct = type({
  to: optional(nullable(EthAddressStruct)),
  from: optional(EthAddressStruct),
  nonce: optional(union([string(), number()])),
  value: optional(union([string(), number()])),
  data: optional(EthBytesStruct),
  gas: optional(union([string(), number()])),
  gasLimit: optional(union([string(), number()])),
  gasPrice: optional(union([string(), number()])),
  maxFeePerGas: optional(union([string(), number()])),
  maxPriorityFeePerGas: optional(union([string(), number()])),
  accessList: optional(
    array(
      type({
        address: EthAddressStruct,
        storageKeys: array(string()),
      }),
    ),
  ),
  type: optional(union([string(), number()])),
  chainId: optional(union([string(), number()])),
});

export type EthTransactionData = Infer<typeof EthTransactionDataStruct>;

/**
 * A struct for TypedDataV1 format (legacy typed data).
 * This is an array of { type, name, value } objects.
 */
export const EthTypedDataV1Struct = array(
  object({
    type: string(),
    name: string(),
    value: any(),
  }),
);

export type EthTypedDataV1 = Infer<typeof EthTypedDataV1Struct>;

/**
 * A struct for TypedData types definition.
 * Maps type names to arrays of { name, type } definitions.
 */
export const EthTypedDataTypesStruct = record(
  string(),
  array(
    object({
      name: string(),
      type: string(),
    }),
  ),
);

export type EthTypedDataTypes = Infer<typeof EthTypedDataTypesStruct>;

/**
 * A struct for TypedMessage format (EIP-712 V3/V4).
 * Contains types, domain, primaryType, and message.
 */
export const EthTypedMessageStruct = object({
  types: EthTypedDataTypesStruct,
  primaryType: string(),
  domain: record(string(), any()),
  message: record(string(), any()),
});

export type EthTypedMessage = Infer<typeof EthTypedMessageStruct>;

/**
 * A struct for EIP-1024 encrypted data format (x25519-xsalsa20-poly1305).
 */
export const EthEncryptedDataStruct = object({
  version: literal('x25519-xsalsa20-poly1305'),
  nonce: string(),
  ephemPublicKey: string(),
  ciphertext: string(),
});

export type EthEncryptedData = Infer<typeof EthEncryptedDataStruct>;

/**
 * A struct for EIP-7702 authorization tuple.
 * Format: [chainId, address, nonce]
 */
export const EthEip7702AuthorizationStruct = tuple([
  union([number(), string()]), // chainId
  EthAddressStruct, // address (contract to delegate to)
  union([number(), string()]), // nonce
]);

export type EthEip7702Authorization = Infer<
  typeof EthEip7702AuthorizationStruct
>;

// ============================================================================
// RPC Method Parameter Structs
// ============================================================================

/**
 * Parameters for `eth_signTransaction`.
 */
export const EthSignTransactionParamsStruct = tuple([EthTransactionDataStruct]);

export type EthSignTransactionParams = Infer<
  typeof EthSignTransactionParamsStruct
>;

/**
 * Parameters for `eth_sign`.
 */
export const EthSignParamsStruct = tuple([
  EthAddressStruct, // address
  EthBytesStruct, // data (hex-encoded message hash)
]);

export type EthSignParams = Infer<typeof EthSignParamsStruct>;

/**
 * Parameters for `personal_sign`.
 */
export const EthPersonalSignParamsStruct = union([
  tuple([EthBytesStruct]), // [data]
  tuple([EthBytesStruct, EthAddressStruct]), // [data, address]
]);

export type EthPersonalSignParams = Infer<typeof EthPersonalSignParamsStruct>;

/**
 * Parameters for `eth_signTypedData_v1`.
 */
export const EthSignTypedDataV1ParamsStruct = tuple([
  EthAddressStruct, // address
  EthTypedDataV1Struct, // typed data array
]);

export type EthSignTypedDataV1Params = Infer<
  typeof EthSignTypedDataV1ParamsStruct
>;

/**
 * Parameters for `eth_signTypedData_v3` and `eth_signTypedData_v4`.
 */
export const EthSignTypedDataParamsStruct = tuple([
  EthAddressStruct, // address
  EthTypedMessageStruct, // typed data object
]);

export type EthSignTypedDataParams = Infer<typeof EthSignTypedDataParamsStruct>;

/**
 * Parameters for `eth_decrypt`.
 */
export const EthDecryptParamsStruct = tuple([EthEncryptedDataStruct]);

export type EthDecryptParams = Infer<typeof EthDecryptParamsStruct>;

/**
 * Parameters for `eth_getAppKeyAddress`.
 */
export const EthGetAppKeyAddressParamsStruct = tuple([
  string(), // origin URL
]);

export type EthGetAppKeyAddressParams = Infer<
  typeof EthGetAppKeyAddressParamsStruct
>;

/**
 * Parameters for `eth_signEip7702Authorization`.
 *
 * @example
 * ```ts
 * const params = [[1, '0xContractAddress', 0]];
 * ```
 */
export const EthSignEip7702AuthorizationParamsStruct = tuple([
  EthEip7702AuthorizationStruct,
]);

export type EthSignEip7702AuthorizationParams = Infer<
  typeof EthSignEip7702AuthorizationParamsStruct
>;
