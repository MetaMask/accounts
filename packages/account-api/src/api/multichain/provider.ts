import type { EntropySourceId, KeyringAccount } from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';

export type MultichainAccountProvider<Account extends KeyringAccount> = {
  getAccount: (id: AccountId) => Account; // Assuming getting an account from the provider can never fail.

  getAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => AccountId[];
};
