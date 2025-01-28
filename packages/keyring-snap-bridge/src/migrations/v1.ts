import {
  BtcAccountType,
  BtcScope,
  EthAccountType,
  EthScope,
  SolAccountType,
  SolScope,
  type KeyringAccount,
} from '@metamask/keyring-api';
import { isBtcMainnetAddress } from '@metamask/keyring-utils';
import { is } from '@metamask/superstruct';
import type { CaipChainId } from '@metamask/utils';

import {
  assertKeyringAccount,
  KeyringAccountV1Struct,
  type KeyringAccountV1,
} from '../account';

/**
 * Checks if an account is an `KeyringAccount` v1.
 *
 * @param account - A v1 account to check.
 * @returns True if the account is v1, false otherwise.
 */
export function isAccountV1(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  account: KeyringAccountV1 | KeyringAccount,
): boolean {
  return is(account, KeyringAccountV1Struct);
}

/**
 * Gets default scopes for a v1 account.
 *
 * @param accountV1 - A v1 account.
 * @returns The list of scopes for that accounts.
 */
export function getScopesForAccountV1(
  accountV1: KeyringAccountV1,
): CaipChainId[] {
  switch (accountV1.type) {
    case EthAccountType.Eoa: {
      // EVM EOA account are compatible with any EVM networks, we use the
      // 'eip155:0' scope as defined in the EVM CAIP-10 namespaces.
      //
      // See: https://namespaces.chainagnostic.org/eip155/caip10
      return [EthScopes.Eoa];
    }
    case EthAccountType.Erc4337: {
      // EVM Erc4337 account
      // NOTE: A Smart Contract account might not be compatible with every chain, in this case we just default
      // to testnet since we cannot really "guess" it from here.
      // Also, there's no official Snap as of today that uses this account type. So this case should never happen
      // in production.
      return [EthScope.Testnet];
    }
    case BtcAccountType.P2wpkh: {
      // Bitcoin uses different accounts for testnet and mainnet
      return [
        isBtcMainnetAddress(accountV1.address)
          ? BtcScope.Mainnet
          : BtcScope.Testnet,
      ];
    }
    case SolAccountType.DataAccount: {
      // Solana account supports multiple chains.
      return [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet];
    }
    default:
      // We re-use EOA scopes if we don't know what to do for now.
      return [EthScopes.Eoa];
  }
}

/**
 * Transform an account v1. This account might have optional fields that are now required by
 * the Keyring API. This function will automatically provides the missing fields with some
 * default values.
 *
 * @param accountV1 - A v1 account to transform.
 * @throws An error if the v1 account cannot be transformed.
 * @returns A valid KeyringAccount.
 */
export function transformAccountV1(
  accountV1: KeyringAccountV1,
): KeyringAccount {
  const { type } = accountV1;

  // EVM EOA account are compatible with any EVM networks, and we use CAIP-2
  // namespaces when the scope relates to ALL chains (from that namespace).
  // So we can automatically inject a valid `scopes` for this, but not for
  // other kind of accounts.
  if (type === EthAccountType.Eoa) {
    // EVM EOA accounts are compatible with any EVM networks, we use the
    // 'eip155:0' scope as defined in the EVM CAIP-10 namespaces.
    //
    // See: https://namespaces.chainagnostic.org/eip155/caip10
    return {
      ...accountV1,
      scopes: getScopesForAccountV1(accountV1),
    };
  }

  // For all other non-EVM and ERC4337 Snap accounts, the `scopes` is required, and
  // each `*AccountStruct` should assert that automatically.
  return assertKeyringAccount(accountV1);
}

/**
 * Migrate an account v1. This account might have optional fields that are now required by
 * the Keyring API. This function will automatically provides the missing fields with some
 * meaningful default values.
 *
 * @param accountV1 - The account to migrate.
 * @returns A valid KeyringAccount.
 */
export function migrateAccountV1(accountV1: KeyringAccountV1): KeyringAccount {
  if (!isAccountV1(accountV1)) {
    // Nothing to do in this case.
    return accountV1 as KeyringAccount;
  }

  return {
    ...accountV1,
    scopes: getScopesForAccountV1(accountV1),
  };
}
