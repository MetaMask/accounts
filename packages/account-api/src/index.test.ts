/* eslint-disable jsdoc/require-jsdoc */

import type { KeyringAccountEntropyMnemonicOptions } from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  BtcScope,
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
  SolAccountType,
  SolMethod,
  SolScope,
} from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import type { MultichainAccountGroupId, Bip44Account } from './api';
import {
  AccountWalletType,
  toAccountGroupId,
  toAccountWalletId,
  toDefaultAccountGroupId,
  getGroupIndexFromMultichainAccountId,
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

const mockBtcP2wpkhAccount: MockedAccount = {
  id: 'b0f030d8-e101-4b5a-a3dd-13f8ca8ec1db',
  type: BtcAccountType.P2wpkh,
  methods: [BtcMethod.SendBitcoin],
  address: 'bc1qx8ls07cy8j8nrluy2u0xwn7gh8fxg0rg4s8zze',
  options: mockAccountOptions,
  scopes: [BtcScope.Mainnet],
  metadata: {
    name: 'Account 2',
    importTime: 0,
    keyring: {
      type: 'Snap keyring',
    },
    snap: {
      id: 'mock-btc-snap-id',
      enabled: true,
      name: 'Mock Bitcoin Snap',
    },
  },
} as const;

const mockBtcP2trAccount: MockedAccount = {
  id: 'a20c2e1a-6ff6-40ba-b8e0-ccdb6f9933bb',
  type: BtcAccountType.P2tr,
  methods: [BtcMethod.SendBitcoin],
  address: 'tb1p5cyxnuxmeuwuvkwfem96lxx9wex9kkf4mt9ll6q60jfsnrzqg4sszkqjnh',
  options: mockAccountOptions,
  scopes: [BtcScope.Testnet],
  metadata: {
    name: 'Account 3',
    importTime: 0,
    keyring: {
      type: 'Snap keyring',
    },
    snap: {
      id: 'mock-btc-snap-id',
      enabled: true,
      name: 'Mock Bitcoin Snap',
    },
  },
} as const;

const mockSolAccount: MockedAccount = {
  id: '3648c675-6172-485b-a196-4668780b1a58',
  type: SolAccountType.DataAccount,
  methods: [SolMethod.SignAndSendTransaction],
  address: 'DphAa9aQdzRSacjh5czkapALbVDZS4Q4iMctE3wbr3c4',
  options: mockAccountOptions,
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
  metadata: {
    name: 'Account 4',
    importTime: 0,
    keyring: {
      type: 'Snap keyring',
    },
    snap: {
      id: 'mock-solana-snap-id',
      enabled: true,
      name: 'Mock Solana Snap',
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

    describe('getGroupIndexFromMultichainAccountId', () => {
      it('extracts the group index from its group id', () => {
        const groupIndex = 2;

        const walletId = toMultichainAccountWalletId('test');
        const groupId = toMultichainAccountGroupId(walletId, groupIndex);

        expect(getGroupIndexFromMultichainAccountId(groupId)).toBe(groupIndex);
      });

      it('throws if it cannot extract group index', () => {
        const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
        const groupId = toAccountGroupId(walletId, 'test');

        expect(() =>
          getGroupIndexFromMultichainAccountId(
            // Force the error case even though, type wise, this should not
            // be possible!
            groupId as unknown as MultichainAccountGroupId,
          ),
        ).toThrow('Unable to extract group index');
      });
    });
  });
});
