import {
  BtcAccountType,
  BtcScopes,
  EthAccountType,
  EthScopes,
  SolAccountType,
  SolScopes,
  type KeyringAccount,
} from '@metamask/keyring-api';
import { isBtcMainnetAddress } from '@metamask/keyring-utils';

import type { KeyringAccountV1 } from '../account';

/**
 * Checks if an account is an `KeyringAccount` v1.
 *
 * @param account - The account to check.
 * @returns True if the account is v1, false otherwise.
 */
export function isAccountV1(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  account: KeyringAccountV1 | KeyringAccount,
): boolean {
  const { scopes } = account;

  // If we don't have a `scopes` field, then we are not compatible with a normal `KeyringAccount`.
  return scopes === undefined;
}

/**
 * Transform an account v1. This account might have optional fields that are now required by
 * the Keyring API. This function will automatically provides the missing fields with some
 * default values.
 *
 * @param accountV1 - The account (coming from keyring events) to transform.
 * @throws An error if the v1 account cannot be transformed.
 * @returns A valid KeyringAccount.
 */
export function transformAccountV1(
  accountV1: KeyringAccountV1,
): KeyringAccount {
  const { type } = accountV1;

  if (!isAccountV1(accountV1)) {
    // Nothing to do in this case.
    return accountV1 as KeyringAccount;
  }

  if (type === EthAccountType.Eoa) {
    // EVM EOA account are compatible with any EVM networks, and we use CAIP-2
    // namespaces when the scope relates to ALL chains (from that namespace).
    return {
      ...accountV1,
      scopes: [EthScopes.Namespace],
    };
  }

  // For all non-EVM Snaps and ERC4337 Snaps, the scopes is required.
  throw new Error(
    `Account scopes is required for non-EVM and ERC4337 accounts`,
  );
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
  const { type } = accountV1;

  if (!isAccountV1(accountV1)) {
    // Nothing to do in this case.
    return accountV1 as KeyringAccount;
  }

  switch (type) {
    case EthAccountType.Eoa: {
      // EVM EOA account are compatible with any EVM networks, and we use CAIP-2
      // namespaces when the scope relates to ALL chains (from that namespace).
      return {
        ...accountV1,
        scopes: [EthScopes.Namespace],
      };
    }
    case EthAccountType.Erc4337: {
      // EVM Erc4337 account
      // NOTE: A Smart Contract account might not be compatible with every chain, but we still use
      // "generic" scope for now. Also, there's no official Snap as of today that uses this account type. So
      // this case should never happen.
      return {
        ...accountV1,
        scopes: [EthScopes.Namespace],
      };
    }
    case BtcAccountType.P2wpkh: {
      // Bitcoin uses different accounts for testnet and mainnet
      return {
        ...accountV1,
        scopes: [
          isBtcMainnetAddress(accountV1.address)
            ? BtcScopes.Mainnet
            : BtcScopes.Testnet,
        ],
      };
    }
    case SolAccountType.DataAccount: {
      // Solana account supports multiple chains.
      return {
        ...accountV1,
        scopes: [SolScopes.Mainnet, SolScopes.Testnet, SolScopes.Devnet],
      };
    }
    default:
      // For now, if none of the account's type matches and that we have no scopes, then
      // we will consider this account as an EOA accounts.
      return {
        ...accountV1,
        scopes: [EthScopes.Namespace],
      };
  }
}
