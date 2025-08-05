import type { KeyringAccount } from '@metamask/keyring-api';
import { isScopeEqualToAny } from '@metamask/keyring-utils';

/**
 * Utility functions to check that both arrays are empty, and thus, identical.
 *
 * @param a - First array.
 * @param b - Second array.
 * @returns True if both arrays are empty, false otherwise.
 */
function areBothEmpty<Value>(a: Value[], b: Value[]): boolean {
  return a.length === 0 && b.length === 0;
}

/**
 * Selector to query a specific account based on some criteria.
 */
export type AccountSelector<Account extends KeyringAccount> = {
  /**
   * Query by account ID.
   */
  id?: Account['id'];

  /**
   * Query by account address.
   */
  address?: Account['address'];

  /**
   * Query by account type.
   */
  type?: Account['type'];

  /**
   * Query by account methods.
   */
  methods?: Account['methods'];

  /**
   * Query by account scopes.
   */
  scopes?: Account['scopes'];
};

/**
 * Query an account matching the selector.
 *
 * @param accounts - List of accounts to select from.
 * @param selector - Query selector.
 * @returns The account matching the selector or undefined if not matching.
 * @throws If multiple accounts match the selector.
 */
export function selectOne<Account extends KeyringAccount>(
  accounts: Account[],
  selector: AccountSelector<Account>,
): Account | undefined {
  const matched = select(accounts, selector);

  if (matched.length > 1) {
    throw new Error(
      `Too many account candidates, expected 1, got: ${matched.length}`,
    );
  }

  if (matched.length === 0) {
    return undefined;
  }

  return matched[0]; // This is safe, see checks above.
}

/**
 * Query accounts matching the selector.
 *
 * @param accounts - List of accounts to select from.
 * @param selector - Query selector.
 * @returns The accounts matching the selector.
 */
export function select<Account extends KeyringAccount>(
  accounts: Account[],
  selector: AccountSelector<Account>,
): Account[] {
  return accounts.filter((account) => {
    let selected = true;

    if (selector.id) {
      selected &&= account.id === selector.id;
    }
    if (selector.address) {
      selected &&= account.address === selector.address;
    }
    if (selector.type) {
      selected &&= account.type === selector.type;
    }
    if (selector.methods !== undefined) {
      selected &&=
        areBothEmpty(selector.methods, account.methods) ||
        selector.methods.some((method) => account.methods.includes(method));
    }
    if (selector.scopes !== undefined) {
      selected &&=
        areBothEmpty(selector.scopes, account.scopes) ||
        selector.scopes.some((scope) => {
          return (
            // This will cover specific EVM EOA scopes as well.
            isScopeEqualToAny(scope, account.scopes)
          );
        });
    }

    return selected;
  });
}
