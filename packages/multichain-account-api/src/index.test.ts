/* eslint-disable jsdoc/require-jsdoc */

import type {
  DiscoveredAccount,
  EntropySourceId,
  KeyringAccount,
} from '@metamask/keyring-api';
import {
  BtcAccountType,
  BtcMethod,
  BtcScope,
  EthAccountType,
  EthMethod,
  EthScope,
  SolAccountType,
  SolMethod,
  SolScope,
} from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { v4 as uuid } from 'uuid';

import type {
  AccountProvider,
  MultichainAccount,
  MultichainAccountGroupObject,
  MultichainAccountSelector,
  MultichainAccountWallet,
  MultichainAccountWalletObject,
} from './api';
import {
  MultichainAccountAdapter,
  MultichainAccountWalletAdapter,
  toMultichainAccountId,
} from './api';

const mockEvmAccount: InternalAccount = {
  id: '4b660336-b935-44cc-bdc4-642648279ac7',
  type: EthAccountType.Eoa,
  methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
  address: '0x2A38B198895f358c3232BB6c661aA4eFB1d2e2fc',
  options: {},
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Account 1',
    importTime: 0,
    keyring: {
      type: 'HD Keyring',
    },
  },
} as const;

const mockBtcP2wpkhAccount: InternalAccount = {
  id: 'b0f030d8-e101-4b5a-a3dd-13f8ca8ec1db',
  type: BtcAccountType.P2wpkh,
  methods: [BtcMethod.SendBitcoin],
  address: 'bc1qx8ls07cy8j8nrluy2u0xwn7gh8fxg0rg4s8zze',
  options: {},
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

const mockBtcP2trAccount: InternalAccount = {
  id: 'a20c2e1a-6ff6-40ba-b8e0-ccdb6f9933bb',
  type: BtcAccountType.P2tr,
  methods: [BtcMethod.SendBitcoin],
  address: 'tb1p5cyxnuxmeuwuvkwfem96lxx9wex9kkf4mt9ll6q60jfsnrzqg4sszkqjnh',
  options: {},
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

const mockSolAccount: InternalAccount = {
  id: '3648c675-6172-485b-a196-4668780b1a58',
  type: SolAccountType.DataAccount,
  methods: [SolMethod.SignAndSendTransaction],
  address: 'DphAa9aQdzRSacjh5czkapALbVDZS4Q4iMctE3wbr3c4',
  options: {},
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

const mockAccounts = {
  [mockEvmAccount.id]: mockEvmAccount,
  [mockSolAccount.id]: mockSolAccount,
  [mockBtcP2trAccount.id]: mockBtcP2trAccount,
  [mockBtcP2wpkhAccount.id]: mockBtcP2wpkhAccount,
} as const;

const mockEntropySource = 'mock-entropy-source';

const mockAccountGroup: MultichainAccountGroupObject = {
  id: `multichain-account-wallet:${mockEntropySource}:0`,
  accounts: Object.keys(mockAccounts),
};

const mockAccountGroup2: MultichainAccountGroupObject = {
  id: `multichain-account-wallet:${mockEntropySource}:2`,
  // We re-use the same accounts, but that`s ok for test purposes.
  accounts: Object.keys(mockAccounts),
};

const mockAccountWallet: MultichainAccountWalletObject = {
  id: `multichain-account-wallet:${mockEntropySource}`,
  groups: [mockAccountGroup, mockAccountGroup2],
};

const mockGetAccount = jest.fn();

function setupMultichainAccount({
  groupIndex = 0,
}: {
  groupIndex?: number;
} = {}): MultichainAccount {
  return new MultichainAccountAdapter({
    group: mockAccountGroup,
    groupIndex,
    getAccount: mockGetAccount,
  });
}

function setupAccountProviders(): AccountProvider[] {
  return [
    mockAccountProviderUsing(mockEvmAccount),
    mockAccountProviderUsing(mockSolAccount),
    mockAccountProviderUsing(mockBtcP2wpkhAccount),
  ];
}

function setupMultichainAccountWallet({
  entropySource = mockEntropySource,
  providers = setupAccountProviders(),
}: {
  entropySource?: EntropySourceId;
  providers?: AccountProvider[];
} = {}): MultichainAccountWallet {
  return new MultichainAccountWalletAdapter({
    wallet: mockAccountWallet,
    providers,
    entropySource,
    getAccount: mockGetAccount,
  });
}

function mockAccountProviderUsing(
  account: InternalAccount,
  { discover = true }: { discover?: boolean } = {},
): AccountProvider {
  return {
    createAccounts: jest
      .fn()
      .mockImplementation(
        async ({ entropySource, groupIndex }): Promise<InternalAccount[]> => {
          // Deep copy existing account.
          const newAccount: InternalAccount = JSON.parse(
            JSON.stringify(account),
          );

          newAccount.id = uuid();
          newAccount.options.entropySource = entropySource;
          newAccount.options.groupIndex = groupIndex;

          return [newAccount];
        },
      ),
    discoverAndCreateAccounts: jest
      .fn()
      .mockImplementation(
        async ({ groupIndex }): Promise<DiscoveredAccount[]> => {
          if (!discover) {
            return [];
          }

          return groupIndex === 0
            ? // Discover only the first index.
              [
                {
                  type: 'bip44',
                  scopes: account.scopes,
                  derivationPath: 'm/mock/path',
                },
              ]
            : [];
        },
      ),
  };
}

describe('index', () => {
  describe('MultichainAccount', () => {
    beforeEach(() => {
      mockGetAccount.mockImplementation((id) => mockAccounts[id]);
    });

    it('constructs a multichain account', () => {
      const multichainAccount = setupMultichainAccount();

      const expectedAccounts = Object.values(mockAccounts);
      expect(multichainAccount.id).toStrictEqual(mockAccountGroup.id);
      expect(multichainAccount.index).toBe(0);
      expect(multichainAccount.accounts).toHaveLength(expectedAccounts.length);
      expect(multichainAccount.accounts).toStrictEqual(expectedAccounts);
    });

    it('gets internal account from its id', () => {
      const multichainAccount = setupMultichainAccount();

      expect(multichainAccount.getAccount(mockSolAccount.id)).toStrictEqual(
        mockSolAccount,
      );
      expect(multichainAccount.getAccount(mockEvmAccount.id)).toStrictEqual(
        mockEvmAccount,
      );
    });

    it.each([
      {
        tc: 'using id',
        selector: { id: mockEvmAccount.id },
        expected: mockEvmAccount,
      },
      {
        tc: 'using address',
        selector: { address: mockSolAccount.address },
        expected: mockSolAccount,
      },
      {
        tc: 'using type',
        selector: { type: mockEvmAccount.type },
        expected: mockEvmAccount,
      },
      {
        tc: 'using scope',
        selector: { scopes: [SolScope.Mainnet] },
        expected: mockSolAccount,
      },
      {
        tc: 'using another scope (but still included in the list of account.scopes)',
        selector: { scopes: [SolScope.Testnet] },
        expected: mockSolAccount,
      },
      {
        tc: 'using specific EVM chain still matches with EVM EOA scopes',
        selector: { scopes: [EthScope.Testnet] },
        expected: mockEvmAccount,
      },
      {
        tc: 'using multiple scopes',
        selector: { scopes: [SolScope.Mainnet, SolScope.Testnet] },
        expected: mockSolAccount,
      },
      {
        tc: 'using method',
        selector: { methods: [EthMethod.SignTransaction] },
        expected: mockEvmAccount,
      },
      {
        tc: 'using another method',
        selector: { methods: [EthMethod.PersonalSign] },
        expected: mockEvmAccount,
      },
      {
        tc: 'using multiple methods',
        selector: {
          methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
        },
        expected: mockEvmAccount,
      },
    ] as {
      tc: string;
      selector: MultichainAccountSelector;
      expected: InternalAccount;
    }[])(
      'gets internal account from selector: $tc',
      ({ selector, expected }) => {
        const multichainAccount = setupMultichainAccount();

        expect(multichainAccount.get(selector)).toStrictEqual(expected);
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
        selector: { methods: [EthMethod.Sign] },
      },
    ] as {
      tc: string;
      selector: MultichainAccountSelector;
    }[])('gets undefined if not matching selector: $tc', ({ selector }) => {
      const multichainAccount = setupMultichainAccount();

      expect(multichainAccount.get(selector)).toBeUndefined();
    });

    it('throws if multiple candidates are found', () => {
      const multichainAccount = setupMultichainAccount();

      const selector = {
        scopes: [BtcScope.Mainnet, BtcScope.Testnet],
      };

      expect(() => multichainAccount.get(selector)).toThrow(
        'Too many account candidates, expected 1, got: 2',
      );
    });

    it.each([
      {
        tc: 'using id',
        selector: { id: mockEvmAccount.id },
        expected: [mockEvmAccount],
      },
      {
        tc: 'using non-matching id',
        selector: { id: '66da96d7-8f24-4895-82d6-183d740c2da1' },
        expected: [],
      },
      {
        tc: 'using address',
        selector: { address: mockSolAccount.address },
        expected: [mockSolAccount],
      },
      {
        tc: 'using non-matching address',
        selector: { address: 'unknown-address' },
        expected: [],
      },
      {
        tc: 'using type',
        selector: { type: mockEvmAccount.type },
        expected: [mockEvmAccount],
      },
      {
        tc: 'using non-matching type',
        selector: { type: 'unknown-type' },
        expected: [],
      },
      {
        tc: 'using scope',
        selector: { scopes: [SolScope.Mainnet] },
        expected: [mockSolAccount],
      },
      {
        tc: 'using another scope (but still included in the list of account.scopes)',
        selector: { scopes: [SolScope.Testnet] },
        expected: [mockSolAccount],
      },
      {
        tc: 'using specific EVM chain still matches with EVM EOA scopes',
        selector: { scopes: [EthScope.Testnet] },
        expected: [mockEvmAccount],
      },
      {
        tc: 'using multiple scopes',
        selector: { scopes: [BtcScope.Mainnet, BtcScope.Testnet] },
        expected: [mockBtcP2trAccount, mockBtcP2wpkhAccount],
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
        expected: [mockBtcP2trAccount, mockBtcP2wpkhAccount],
      },
      {
        tc: 'using multiple methods',
        selector: {
          methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
        },
        expected: [mockEvmAccount],
      },
      {
        tc: 'using non-matching method',
        selector: { methods: [EthMethod.Sign] },
        expected: [],
      },
    ] as {
      tc: string;
      selector: MultichainAccountSelector;
      expected: InternalAccount[];
    }[])(
      'selects internal accounts from selector: $tc',
      ({ selector, expected }) => {
        const multichainAccount = setupMultichainAccount();

        expect(multichainAccount.select(selector)).toStrictEqual(expected);
      },
    );
  });

  describe('MultichainAccountWallet', () => {
    it('constructs a multichain account wallet', () => {
      const wallet = setupMultichainAccountWallet({
        entropySource: mockEntropySource,
      });

      expect(wallet.id).toStrictEqual(mockAccountWallet.id);
      expect(wallet.accounts).toHaveLength(mockAccountWallet.groups.length);
      expect(wallet.entropySource).toStrictEqual(mockEntropySource);
    });

    it('creates a new multichain account with the next index', async () => {
      const index = 1;
      const providers = setupAccountProviders();
      const wallet = setupMultichainAccountWallet({ providers });

      const multichainAccount = await wallet.createMultichainAccount(index);

      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(wallet.id, index),
      );
      expect(multichainAccount.index).toBe(index);
      expect(multichainAccount.accounts).toHaveLength(providers.length);
    });

    it('creates a new multichain account with the next index automatically', async () => {
      const providers = setupAccountProviders();
      const wallet = setupMultichainAccountWallet({ providers });

      const index = wallet.getNextGroupIndex();
      const multichainAccount = await wallet.createNextMultichainAccount();

      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(wallet.id, index),
      );
      expect(multichainAccount.index).toBe(index);
      expect(multichainAccount.accounts).toHaveLength(providers.length);
    });

    it('returns the same multichain account if index already exist', async () => {
      const wallet = setupMultichainAccountWallet();

      const multichainAccount = await wallet.createNextMultichainAccount();
      const sameMultichainAccount = await wallet.createMultichainAccount(
        multichainAccount.index,
      );

      expect(sameMultichainAccount).toStrictEqual(multichainAccount);
    });

    it('throws if using an index higher than the next available one', async () => {
      const wallet = setupMultichainAccountWallet();

      const nextIndex = wallet.getNextGroupIndex();
      await expect(
        wallet.createMultichainAccount(nextIndex + 2),
      ).rejects.toThrow(
        `You cannot use an group index that is higher than the next available one: expect <${nextIndex}, got ${
          nextIndex + 2
        }`,
      );
    });

    it('refreshes internal accounts if an account provider return a new account', async () => {
      const evmAccountProvider = mockAccountProviderUsing(mockEvmAccount);
      const btcAccountProvider = mockAccountProviderUsing(mockBtcP2wpkhAccount); // Only native-segwit for now.
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = setupMultichainAccountWallet({ providers });

      // Each providers create 1 account, so both length must match.
      const multichainAccount = await wallet.createNextMultichainAccount();
      expect(multichainAccount.accounts).toHaveLength(providers.length);

      // Re-use old accounts that are already part of the multichain account.
      const oldBtcAccounts = (
        btcAccountProvider.createAccounts as jest.Mock
      ).mock.results.at(-1)?.value as Promise<KeyringAccount[]>;
      expect(oldBtcAccounts).toBeDefined();

      // Now update one of the provider to return 2 accounts instead of 1.
      (btcAccountProvider.createAccounts as jest.Mock).mockImplementation(
        async (args: Parameters<AccountProvider['createAccounts']>[0]) => {
          const btcP2trAccountProvider =
            mockAccountProviderUsing(mockBtcP2trAccount);

          // Re-use old accounts + new ones (e.g if the Bitcoin Snap enable
          // the taproot support dynamically, then its `createAccounts` might now
          // return native segwit + taproot accounts).
          const oldAccounts = await oldBtcAccounts;
          const newAccounts = await btcP2trAccountProvider.createAccounts(args);

          return oldAccounts.concat(newAccounts);
        },
      );

      const refreshedMultichainAccount = await wallet.createMultichainAccount(
        multichainAccount.index,
      );
      expect(refreshedMultichainAccount.accounts).toHaveLength(
        providers.length + 1, // +1 since we also have a taproot account now.
      );
    });

    it('discovers accounts and create accounts', async () => {
      const evmAccountProvider = mockAccountProviderUsing(mockEvmAccount);
      const btcAccountProvider = mockAccountProviderUsing(mockBtcP2wpkhAccount);
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = setupMultichainAccountWallet({ providers });

      const accounts = await wallet.discoverAndCreateMultichainAccounts();
      expect(accounts).toHaveLength(1); // We only discover for index 0 in the test setup.
    });

    it('discovers accounts and create missing accounts if one provider did not discovered any account', async () => {
      const evmAccountProvider = mockAccountProviderUsing(mockEvmAccount);
      const btcAccountProvider = mockAccountProviderUsing(
        mockBtcP2wpkhAccount,
        { discover: false },
      );
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = setupMultichainAccountWallet({ providers });

      const accounts = await wallet.discoverAndCreateMultichainAccounts();
      expect(accounts).toHaveLength(1); // We only discover for index 0 in the test setup.
      expect(accounts[0]?.accounts).toHaveLength(2); // EVM + BTC.
    });
  });
});
