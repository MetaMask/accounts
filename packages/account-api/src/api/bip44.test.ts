import type { KeyringAccountEntropyMnemonicOptions } from '@metamask/keyring-api';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';

import { isBip44Account, assertIsBip44Account } from './bip44';
import { MOCK_ENTROPY_SOURCE_1, MOCK_HD_ACCOUNT_1 } from '../mocks';

describe('bip44', () => {
  describe('isBip44Account', () => {
    it('returns true if the account is BIP-44 compatible', () => {
      expect(isBip44Account(MOCK_HD_ACCOUNT_1)).toBe(true);
      expect(() => assertIsBip44Account(MOCK_HD_ACCOUNT_1)).not.toThrow();
    });

    it.each([
      {
        tc: 'missing type',
        options: {
          entropy: {
            // Missing type.
            id: MOCK_ENTROPY_SOURCE_1,
            groupIndex: 0,
            derivationPath: '',
          },
        },
      },
      {
        tc: 'missing id',
        options: {
          entropy: {
            type: KeyringAccountEntropyTypeOption.Mnemonic,
            // Missing id.
            groupIndex: 0,
            derivationPath: '',
          },
        },
      },
      {
        tc: 'missing groupIndex',
        options: {
          entropy: {
            type: 'mnemonic',
            id: MOCK_ENTROPY_SOURCE_1,
            // Missing groupIndex.
            derivationPath: '',
          },
        },
      },
      {
        tc: 'missing derivationPath',
        options: {
          entropy: {
            type: 'mnemonic',
            id: MOCK_ENTROPY_SOURCE_1,
            groupIndex: 0,
            // Missing derivationPath.
          },
        },
      },
    ])(
      'returns false if the account is not BIP-44 compatible with: $tc',
      ({ options }) => {
        const account = {
          ...MOCK_HD_ACCOUNT_1,
          options: {
            entropy:
              // Force the error case here.
              options as unknown as KeyringAccountEntropyMnemonicOptions,
          },
        };

        expect(isBip44Account(account)).toBe(false);
        expect(() => assertIsBip44Account(account)).toThrow(
          'Account is not BIP-44 compatible',
        );
      },
    );
  });
});
