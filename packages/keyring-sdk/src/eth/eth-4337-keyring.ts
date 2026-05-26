import type {
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  KeyringExecutionContext,
} from '@metamask/keyring-api';

/**
 * Legacy ETH keyring methods for ERC-4337 accounts.
 */
export type Eth4337Keyring = {
  /**
   * Convert base transactions to a base UserOperation.
   *
   * @param address - Address of the account to prepare the user operation for.
   * @param transactions - Base transactions to include in the UserOperation.
   * @param context - Keyring execution context.
   * @returns A pseudo-UserOperation that can be used to construct a real one.
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
   * @param address - Address of the account to patch the user operation for.
   * @param userOperation - UserOperation to patch.
   * @param context - Keyring execution context.
   * @returns A patch to apply to the UserOperation.
   */
  patchUserOperation?(
    address: string,
    userOperation: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<EthUserOperationPatch>;

  /**
   * Signs a UserOperation.
   *
   * @param address - Address of the account to sign the user operation for.
   * @param userOperation - UserOperation to sign.
   * @param context - Keyring execution context.
   * @returns A promise that resolves to the signature.
   */
  signUserOperation?(
    address: string,
    userOperation: EthUserOperation,
    context: KeyringExecutionContext,
  ): Promise<string>;
};
