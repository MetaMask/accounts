import type { KeyringAccountType } from '@metamask/keyring-api';
import { EthAccountType } from '@metamask/keyring-api';

/**
 * Checks if the given type is an EVM account type.
 *
 * @param type - The type to check.
 * @returns Returns true if the type is an EVM account type, false otherwise.
 */
export function isEvmAccountType(type: KeyringAccountType): boolean {
  return type === EthAccountType.Eoa || type === EthAccountType.Erc4337;
}
