import type { KeyringAccount, KeyringAccountType } from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcP2wpkhAccountStruct,
  EthAccountType,
  EthEoaAccountStruct,
  EthErc4337AccountStruct,
  KeyringAccountStruct,
  SolAccountType,
  SolDataAccountStruct,
} from '@metamask/keyring-api';
import { assert, omit, type Infer } from '@metamask/superstruct';

import { isAccountV1, transformAccountV1 } from './migrations';

/**
 * A `KeyringAccount` with some optional fields which can be used to keep
 * the retro-compatility with older version of keyring accounts/events.
 */
export const KeyringAccountV1Struct = omit(KeyringAccountStruct, ['scopes']);

export type KeyringAccountV1 = Infer<typeof KeyringAccountV1Struct>;

/**
 * Assert that an account-like object matches its actual account type.
 *
 * @param account - The account-like object.
 * @returns The account as normal `KeyringAccount`.
 */
export function assertKeyringAccount<
  Account extends { type: KeyringAccountType },
>(account: Account): KeyringAccount {
  // TODO: We should use a `selectiveUnion` for this and probably use it to define
  // the `KeyringAccount`. This would also required to have a "generic `KeyringAccount`"
  // definition.
  switch (account.type) {
    case BtcAccountType.P2wpkh: {
      assert(account, BtcP2wpkhAccountStruct);
      return account;
    }
    case SolAccountType.DataAccount: {
      assert(account, SolDataAccountStruct);
      return account;
    }
    case EthAccountType.Erc4337: {
      assert(account, EthErc4337AccountStruct);
      return account;
    }
    case EthAccountType.Eoa: {
      assert(account, EthEoaAccountStruct);
      return account;
    }
    default: {
      // For now, we cannot much more than this (this should also, never happen)!
      // NOTE: We could use a  "generic `KeyringAccount` type" here though.
      throw new Error(`Unknown account type: '${account.type}'`);
    }
  }
}

/**
 * Transform any versionned account to a `KeyringAccount`.
 *
 * @param accountToTransform - The account to transform.
 * @returns A valid transformed `KeyringAccount`.
 */
export function transformAccount(
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  accountToTransform: KeyringAccountV1 | KeyringAccount,
): KeyringAccount {
  // To keep the retro-compatibility with older keyring-api versions, we identify the account's
  // version and transform it to the latest `KeyringAccount` representation.
  const account = isAccountV1(accountToTransform)
    ? transformAccountV1(accountToTransform)
    : accountToTransform;

  // We still assert that the converted account is valid according to their account's type.
  return assertKeyringAccount(account);
}
