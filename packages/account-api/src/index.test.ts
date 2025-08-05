/* eslint-disable jsdoc/require-jsdoc */

import type { KeyringAccountEntropyMnemonicOptions } from '@metamask/keyring-api';
import { KeyringAccountEntropyTypeOption } from '@metamask/keyring-api';

import type { MultichainAccountGroupId } from './api';
import {
  AccountWalletType,
  toAccountGroupId,
  toAccountWalletId,
  toDefaultAccountGroupId,
  getGroupIndexFromMultichainAccountGroupId,
  isBip44Account,
  toMultichainAccountWalletId,
  toMultichainAccountGroupId,
  isMultichainAccountGroupId,
  assertIsBip44Account,
} from './api';
import { MOCK_HD_ACCOUNT_1 } from './mocks/accounts';

const mockEntropySource = 'mock-entropy-source';

describe('index', () => {
  describe('toAccountGroupId', () => {
    it('converts an account wallet id and a unique id to a group id', () => {
      const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
      const groupId = toAccountGroupId(walletId, 'test');

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });

  describe('toDefaultAccountGroupId', () => {
    it('converts an account wallet id and to the default group id', () => {
      const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
      const groupId = toDefaultAccountGroupId(walletId);

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });

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
              id: mockEntropySource,
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
              id: mockEntropySource,
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
              id: mockEntropySource,
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

  describe('multichain', () => {
    describe('isMultichainAccountGroupId', () => {
      it('returns true if a group id is a multichain group id', () => {
        const walletId = toMultichainAccountWalletId('test');
        const groupId = toMultichainAccountGroupId(walletId, 0);

        expect(isMultichainAccountGroupId(groupId)).toBe(true);
      });

      it('fails if a group id is not a multichain group id', () => {
        const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
        const groupId = toAccountGroupId(walletId, 'test');

        expect(isMultichainAccountGroupId(groupId)).toBe(false);
      });
    });

    describe('getGroupIndexFromMultichainAccountGroupId', () => {
      it('extracts the group index from its group id', () => {
        const groupIndex = 2;

        const walletId = toMultichainAccountWalletId('test');
        const groupId = toMultichainAccountGroupId(walletId, groupIndex);

        expect(getGroupIndexFromMultichainAccountGroupId(groupId)).toBe(
          groupIndex,
        );
      });

      it('throws if it cannot extract group index', () => {
        const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
        const groupId = toAccountGroupId(walletId, 'test');

        expect(() =>
          getGroupIndexFromMultichainAccountGroupId(
            // Force the error case even though, type wise, this should not
            // be possible!
            groupId as unknown as MultichainAccountGroupId,
          ),
        ).toThrow('Unable to extract group index');
      });
    });
  });
});
