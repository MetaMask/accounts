/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import type {
  KeyringExecutionContext,
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
} from '@metamask/keyring-api';
import type { Keyring } from '@metamask/keyring-utils';

export type EthKeyring = Keyring & {
  /**
   * Convert a base transaction to a base UserOperation.
   *
   * @param address - Address of the sender.
   * @param transactions - Base transactions to include in the UserOperation.
   * @param context - Keyring execution context.
   * @returns A pseudo-UserOperation that can be used to construct a real.
   */
  prepareUserOperation?(
    address: string,
    transactions: EthBaseTransaction[],
    context: KeyringExecutionContext,
  ): Promise<EthBaseUserOperation>;

  /**
   * Patches properties of a UserOperation. Currently, only the
   * `paymasterAndData` can be patched.
   *
   * @param address - Address of the sender.
   * @param userOp - UserOperation to patch.
   * @param context - Keyring execution context.
   * @returns A patch to apply to the UserOperation.
   */
  patchUserOperation?(
    address: string,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<EthUserOperationPatch>;

  /**
   * Signs an UserOperation.
   *
   * @param address - Address of the sender.
   * @param userOp - UserOperation to sign.
   * @param context - Keyring execution context.
   * @returns The signature of the UserOperation.
   */
  signUserOperation?(
    address: string,
    userOp: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string>;
};
