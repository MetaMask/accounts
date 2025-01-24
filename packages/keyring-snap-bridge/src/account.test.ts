import type { KeyringAccount } from '@metamask/keyring-api';

import { transformAccount } from './account';

describe('account', () => {
  it('throws for unknown account type', () => {
    const unknownAccount = {
      // This should not be really possible to create such account, but since we potentially
      // migrate data upon the Snap keyring initialization, we want to cover edge-cases
      // like this one to avoid crashing and blocking everything...
      type: 'unknown:type',
    } as unknown as KeyringAccount; // Just testing the default case.

    expect(() => transformAccount(unknownAccount)).toThrow(
      "Unknown account type: 'unknown:type'",
    );
  });
});
