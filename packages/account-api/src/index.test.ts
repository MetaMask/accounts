/* eslint-disable jsdoc/require-jsdoc */

import type { KeyringAccountEntropyMnemonicOptions } from '@metamask/keyring-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import type { MultichainAccountGroupId, Bip44Account } from './api';
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
} from './api';

type MockedAccount = Bip44Account<InternalAccount>;

const mockEntropySource = 'mock-entropy-source';

const mockAccountOptions: MockedAccount['options'] = {
  entropy: {
    type: KeyringAccountEntropyTypeOption.Mnemonic,
    id: mockEntropySource,
    groupIndex: 0,
    derivationPath: '',
  },
} as const;

const mockEvmAccount: MockedAccount = {
  id: '4b660336-b935-44cc-bdc4-642648279ac7',
  type: EthAccountType.Eoa,
  methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
  address: '0x2A38B198895f358c3232BB6c661aA4eFB1d2e2fc',
  options: mockAccountOptions,
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 1',
    importTime: 0,
    keyring: {
      type: 'HD Keyring',
    },
  },
} as const;

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
        expect(isBip44Account(mockEvmAccount)).toBe(true);
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
            ...mockEvmAccount,
            options: {
              entropy:
                // Force the error case here.
                options as unknown as KeyringAccountEntropyMnemonicOptions,
            },
          };

          expect(isBip44Account(account)).toBe(false);
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
