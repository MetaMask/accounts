import type { EntropySourceId } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

export type AccountProvider = {
  getEntropySources: () => EntropySourceId[];

  getAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => InternalAccount[];

  createAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<InternalAccount[]>;

  discoverAndCreateAccounts: (opts: {
    entropySource: EntropySourceId;
    groupIndex: number;
  }) => Promise<InternalAccount[]>;
};
