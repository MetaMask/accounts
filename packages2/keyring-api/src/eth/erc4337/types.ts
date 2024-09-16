import { type Infer } from '@metamask/superstruct';

import { exactOptional, object } from '../../superstruct';
import { UrlStruct } from '../../utils';
import { EthAddressStruct, EthBytesStruct, EthUint256Struct } from '../types';

/**
 * Struct of a UserOperation as defined by ERC-4337.
 * @see https://eips.ethereum.org/EIPS/eip-4337#definitions
 */
export const EthUserOperationStruct = object({
  sender: EthAddressStruct,
  nonce: EthUint256Struct,
  initCode: EthBytesStruct,
  callData: EthBytesStruct,
  callGasLimit: EthUint256Struct,
  verificationGasLimit: EthUint256Struct,
  preVerificationGas: EthUint256Struct,
  maxFeePerGas: EthUint256Struct,
  maxPriorityFeePerGas: EthUint256Struct,
  paymasterAndData: EthBytesStruct,
  signature: EthBytesStruct,
});

export type EthUserOperation = Infer<typeof EthUserOperationStruct>;

/**
 * Struct containing the most basic transaction information required to
 * construct a UserOperation.
 */
export const EthBaseTransactionStruct = object({
  /**
   * Address of the transaction recipient.
   */
  to: EthAddressStruct,

  /**
   * Amount of wei to transfer to the recipient.
   */
  value: EthUint256Struct,

  /**
   * Data to pass to the recipient.
   */
  data: EthBytesStruct,
});

export type EthBaseTransaction = Infer<typeof EthBaseTransactionStruct>;

export const EthBaseUserOperationStruct = object({
  nonce: EthUint256Struct,
  initCode: EthBytesStruct,
  callData: EthBytesStruct,
  gasLimits: exactOptional(
    object({
      callGasLimit: EthUint256Struct,
      verificationGasLimit: EthUint256Struct,
      preVerificationGas: EthUint256Struct,
    }),
  ),
  dummyPaymasterAndData: EthBytesStruct,
  dummySignature: EthBytesStruct,
  bundlerUrl: UrlStruct,
});

export type EthBaseUserOperation = Infer<typeof EthBaseUserOperationStruct>;

export const EthUserOperationPatchStruct = object({
  paymasterAndData: EthBytesStruct,
  callGasLimit: exactOptional(EthUint256Struct),
  verificationGasLimit: exactOptional(EthUint256Struct),
  preVerificationGas: exactOptional(EthUint256Struct),
});

export type EthUserOperationPatch = Infer<typeof EthUserOperationPatchStruct>;
