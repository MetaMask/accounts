import type { KeyringAccount } from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  BtcScope,
  EthAccountType,
  EthMethod,
  EthScope,
  SolScope,
} from '@metamask/keyring-api';

import type { Bip44Account } from './bip44';
import type { AccountSelector } from './selector';
import { select, selectOne } from './selector';
import {
  MOCK_WALLET_1_BTC_P2TR_ACCOUNT,
  MOCK_WALLET_1_BTC_P2WPKH_ACCOUNT,
  MOCK_WALLET_1_EVM_ACCOUNT,
  MOCK_WALLET_1_SOL_ACCOUNT,
} from '../mocks';

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

    it('matches account when using empty scopes', () => {
      const mockAccountWithNoScopes = {
        ...MOCK_WALLET_1_EVM_ACCOUNT,
        scopes: [],
      };

      expect(
        selectOne([mockAccountWithNoScopes], { scopes: [] }),
      ).toStrictEqual(mockAccountWithNoScopes);
    });

    it('matches account when using empty methods', () => {
      const mockAccountWithNoMethods = {
        ...MOCK_WALLET_1_EVM_ACCOUNT,
        methods: [],
      };

      expect(
        selectOne([mockAccountWithNoMethods], { methods: [] }),
      ).toStrictEqual(mockAccountWithNoMethods);
    });

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
        selector: { methods: [BtcMethod.SendTransfer] },
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
