import type {
  KeyringAccount,
  KeyringAccountEntropyMnemonicOptions,
} from '@metamask/keyring-api';
import { KeyringAccountEntropyMnemonicOptionsStruct } from '@metamask/keyring-api';
import { is } from '@metamask/superstruct';

/**
 * BIP-44 compatible account type.
 */
export type Bip44Account<Account extends KeyringAccount> = Account & {
  // We force the option type for those accounts. (That's how we identify
  // if an account is BIP-44 compatible).
  options: {
    entropy: KeyringAccountEntropyMnemonicOptions;
  };
};

/**
 * Checks if an account is BIP-44 compatible.
 *
 * @param account - The account to be tested.
 * @returns True if the account is BIP-44 compatible.
 */
export function isBip44Account<Account extends KeyringAccount>(
  account: Account,
): account is Bip44Account<Account> {
  // To be BIP-44 compatible, you just need to use this set of options:
  return is(
    account.options.entropy,
    KeyringAccountEntropyMnemonicOptionsStruct,
  );
}
