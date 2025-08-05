/* eslint-disable jsdoc/require-jsdoc */

import type {
  KeyringAccount,
  KeyringAccountEntropyMnemonicOptions,
} from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  BtcScope,
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
  SolScope,
} from '@metamask/keyring-api';

import type {
  MultichainAccountGroupId,
  Bip44Account,
  AccountSelector,
} from './api';
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
  selectOne,
  select,
} from './api';
import {
  MOCK_HD_ACCOUNT_1,
  MOCK_WALLET_1_BTC_P2TR_ACCOUNT,
  MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT,
  MOCK_WALLET_1_EVM_ACCOUNT,
  MOCK_WALLET_1_SOL_ACCOUNT,
} from './mocks/accounts';

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

  describe('selector', () => {
    const accounts = [
      MOCK_WALLET_1_EVM_ACCOUNT,
      MOCK_WALLET_1_SOL_ACCOUNT,
      MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT,
      MOCK_WALLET_1_BTC_P2TR_ACCOUNT,
    ];

    describe('selectOne', () => {
      it.each([
        {
          tc: 'using id',
          selector: { id: MOCK_WALLET_1_EVM_ACCOUNT.id },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
        {
          tc: 'using address',
          selector: { address: MOCK_WALLET_1_SOL_ACCOUNT.address },
          expected: MOCK_WALLET_1_SOL_ACCOUNT,
        },
        {
          tc: 'using type',
          selector: { type: MOCK_WALLET_1_EVM_ACCOUNT.type },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
        {
          tc: 'using scope',
          selector: { scopes: [SolScope.Mainnet] },
          expected: MOCK_WALLET_1_SOL_ACCOUNT,
        },
        {
          tc: 'using another scope (but still included in the list of account.scopes)',
          selector: { scopes: [SolScope.Testnet] },
          expected: MOCK_WALLET_1_SOL_ACCOUNT,
        },
        {
          tc: 'using specific EVM chain still matches with EVM EOA scopes',
          selector: { scopes: [EthScope.Testnet] },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
        {
          tc: 'using multiple scopes',
          selector: { scopes: [SolScope.Mainnet, SolScope.Testnet] },
          expected: MOCK_WALLET_1_SOL_ACCOUNT,
        },
        {
          tc: 'using method',
          selector: { methods: [EthMethod.SignTransaction] },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
        {
          tc: 'using another method',
          selector: { methods: [EthMethod.PersonalSign] },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
        {
          tc: 'using multiple methods',
          selector: {
            methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
          },
          expected: MOCK_WALLET_1_EVM_ACCOUNT,
        },
      ])(
        'gets internal account from selector: $tc',
        async ({ selector, expected }) => {
          expect(selectOne(accounts, selector)).toStrictEqual(expected);
        },
      );

      it.each([
        {
          tc: 'using non-matching id',
          selector: { id: '66da96d7-8f24-4895-82d6-183d740c2da1' },
        },
        {
          tc: 'using non-matching address',
          selector: { address: 'unknown-address' },
        },
        {
          tc: 'using non-matching type',
          selector: { type: 'unknown-type' },
        },
        {
          tc: 'using non-matching scope',
          selector: {
            scopes: ['bip122:12a765e31ffd4059bada1e25190f6e98' /* Litecoin */],
          },
        },
        {
          tc: 'using non-matching method',
          selector: { methods: ['eth_unknownMethod'] },
        },
      ] as {
        tc: string;
        selector: AccountSelector<Bip44Account<KeyringAccount>>;
      }[])(
        'gets undefined if not matching selector: $tc',
        async ({ selector }) => {
          expect(selectOne(accounts, selector)).toBeUndefined();
        },
      );

      it('throws if multiple candidates are found', async () => {
        const selector = {
          scopes: [EthScope.Mainnet, SolScope.Mainnet],
        };

        expect(() => selectOne(accounts, selector)).toThrow(
          'Too many account candidates, expected 1, got: 2',
        );
      });
    });

    describe('select', () => {
      it.each([
        {
          tc: 'using id',
          selector: { id: MOCK_WALLET_1_EVM_ACCOUNT.id },
          expected: [MOCK_WALLET_1_EVM_ACCOUNT],
        },
        {
          tc: 'using non-matching id',
          selector: { id: '66da96d7-8f24-4895-82d6-183d740c2da1' },
          expected: [],
        },
        {
          tc: 'using address',
          selector: { address: MOCK_WALLET_1_SOL_ACCOUNT.address },
          expected: [MOCK_WALLET_1_SOL_ACCOUNT],
        },
        {
          tc: 'using non-matching address',
          selector: { address: 'unknown-address' },
          expected: [],
        },
        {
          tc: 'using type',
          selector: { type: MOCK_WALLET_1_EVM_ACCOUNT.type },
          expected: [MOCK_WALLET_1_EVM_ACCOUNT],
        },
        {
          tc: 'using non-matching type',
          selector: { type: 'unknown-type' },
          expected: [],
        },
        {
          tc: 'using scope',
          selector: { scopes: [SolScope.Mainnet] },
          expected: [MOCK_WALLET_1_SOL_ACCOUNT],
        },
        {
          tc: 'using another scope (but still included in the list of account.scopes)',
          selector: { scopes: [SolScope.Testnet] },
          expected: [MOCK_WALLET_1_SOL_ACCOUNT],
        },
        {
          tc: 'using specific EVM chain still matches with EVM EOA scopes',
          selector: { scopes: [EthScope.Testnet] },
          expected: [MOCK_WALLET_1_EVM_ACCOUNT],
        },
        {
          tc: 'using multiple scopes',
          selector: { scopes: [BtcScope.Mainnet, BtcScope.Testnet] },
          expected: [
            MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT,
            MOCK_WALLET_1_BTC_P2TR_ACCOUNT,
          ],
        },
        {
          tc: 'using non-matching scopes',
          selector: {
            scopes: ['bip122:12a765e31ffd4059bada1e25190f6e98' /* Litecoin */],
          },
          expected: [],
        },
        {
          tc: 'using method',
          selector: { methods: [BtcMethod.SendBitcoin] },
          expected: [
            MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT,
            MOCK_WALLET_1_BTC_P2TR_ACCOUNT,
          ],
        },
        {
          tc: 'using multiple methods',
          selector: {
            methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
          },
          expected: [MOCK_WALLET_1_EVM_ACCOUNT],
        },
        {
          tc: 'using non-matching method',
          selector: { methods: ['eth_unknownMethod'] },
          expected: [],
        },
        {
          tc: 'using multiple selectors',
          selector: {
            type: EthAccountType.Eoa,
            methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
          },
          expected: [MOCK_WALLET_1_EVM_ACCOUNT],
        },
        {
          tc: 'using non-matching selectors',
          selector: {
            type: BtcAccountType.P2wpkh,
            methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
          },
          expected: [],
        },
      ] as {
        tc: string;
        selector: AccountSelector<Bip44Account<KeyringAccount>>;
        expected: Bip44Account<KeyringAccount>[];
      }[])(
        'selects internal accounts from selector: $tc',
        async ({ selector, expected }) => {
          expect(select(accounts, selector)).toStrictEqual(expected);
        },
      );
    });
  });
});
