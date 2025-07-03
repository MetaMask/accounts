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
  MultichainAccountSelector,
  MultichainAccountWallet,
} from './api';
import {
  MultichainAccountAdapter,
  MultichainAccountWalletAdapter,
  toMultichainAccountId,
  toMultichainAccountWalletId,
} from './api';

const mockEntropySource = 'mock-entropy-source';

const mockEvmAccount: InternalAccount = {
  id: '4b660336-b935-44cc-bdc4-642648279ac7',
  type: EthAccountType.Eoa,
  methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
  address: '0x2A38B198895f358c3232BB6c661aA4eFB1d2e2fc',
  options: {
    entropySource: mockEntropySource,
    index: 0,
  },
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
  options: {
    entropySource: mockEntropySource,
    index: 0,
  },
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
  options: {
    entropySource: mockEntropySource,
    index: 0,
  },
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
  options: {
    entropySource: mockEntropySource,
    index: 0,
  },
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

class MockAccountProvider implements AccountProvider {
  readonly #createAccounts: () => InternalAccount[];

  readonly #accounts: InternalAccount[];

  constructor(
    createAccounts: () => InternalAccount[],
    accounts: InternalAccount[],
  ) {
    this.#createAccounts = createAccounts;
    this.#accounts = accounts;
  }

  getEntropySources = jest.fn().mockImplementation((): EntropySourceId[] => {
    const entropySources = new Set<EntropySourceId>(
      this.#accounts.map(
        // Assuming it's always defined in our tests.
        (account) => account.options.entropySource as EntropySourceId,
      ),
    );

    return Array.from(entropySources);
  });

  getAccounts = jest
    .fn()
    .mockImplementation(({ entropySource, groupIndex }): InternalAccount[] => {
      return this.#accounts.filter(
        (account) =>
          account.options.entropySource === entropySource &&
          account.options.index === groupIndex,
      );
    });

  createAccounts = jest
    .fn()
    .mockImplementation(
      async ({ entropySource, groupIndex }): Promise<InternalAccount[]> => {
        const accounts = this.#createAccounts().map((baseAccount) => {
          // Deep copy existing account.
          const account: InternalAccount = JSON.parse(
            JSON.stringify(baseAccount),
          );

          account.id = uuid();
          account.address += `+${groupIndex}`; // Adds the index to the address to make it unique.
          account.options.entropySource = entropySource;
          account.options.index = groupIndex;
          account.metadata.name += ` + ${groupIndex}`; // Same for the name.

          return account;
        });

        for (const account of accounts) {
          this.#accounts.push(account);
        }

        return accounts;
      },
    );

  discoverAndCreateAccounts = jest
    .fn()
    .mockImplementation(
      async ({ groupIndex }): Promise<DiscoveredAccount[]> => {
        return this.#accounts.flatMap((account) => {
          return account.options.index === groupIndex
            ? [
                {
                  type: 'bip44',
                  scopes: account.scopes,
                  derivationPath: `m/mock/path/${groupIndex}`,
                },
              ]
            : [];
        });
      },
    );
}
function setupAccountProviders(): AccountProvider[] {
  return [
    new MockAccountProvider(() => [mockEvmAccount], [mockEvmAccount]),
    new MockAccountProvider(() => [mockSolAccount], [mockSolAccount]),
    new MockAccountProvider(
      () => [mockBtcP2wpkhAccount, mockBtcP2trAccount],
      [mockBtcP2wpkhAccount, mockBtcP2trAccount],
    ),
  ];
}

async function setupMultichainAccount({
  wallet,
  groupIndex = 0,
  providers = setupAccountProviders(),
}: {
  wallet: MultichainAccountWallet;
  groupIndex?: number;
  providers?: AccountProvider[];
}): Promise<MultichainAccount> {
  return new MultichainAccountAdapter({
    wallet,
    groupIndex,
    providers,
  });
}

async function setupMultichainAccountWallet({
  entropySource = mockEntropySource,
  providers = setupAccountProviders(),
}: {
  entropySource?: EntropySourceId;
  providers?: AccountProvider[];
  init?: boolean;
} = {}): Promise<MultichainAccountWallet> {
  return new MultichainAccountWalletAdapter({
    providers,
    entropySource,
  });
}

describe('index', () => {
  describe('MultichainAccount', () => {
    const setup = (): {
      wallet: MultichainAccountWallet;
      providers: AccountProvider[];
    } => {
      const providers = setupAccountProviders();
      const wallet = new MultichainAccountWalletAdapter({
        providers,
        entropySource: mockEntropySource,
      });

      return { wallet, providers };
    };

    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('constructs a multichain account', async () => {
      const { wallet, providers } = setup();
      const groupIndex = 0;
      const multichainAccount = await setupMultichainAccount({
        wallet,
        groupIndex,
      });

      const expectedWalletId = toMultichainAccountWalletId(
        wallet.entropySource,
      );
      const expectedAccounts = providers.flatMap((provider) =>
        provider.getAccounts({
          entropySource: wallet.entropySource,
          groupIndex,
        }),
      );
      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(expectedWalletId, groupIndex),
      );
      expect(multichainAccount.index).toBe(groupIndex);
      expect(multichainAccount.wallet).toStrictEqual(wallet);
      expect(multichainAccount.accounts).toHaveLength(expectedAccounts.length);
      expect(multichainAccount.accounts).toStrictEqual(expectedAccounts);
    });

    it('constructs a multichain account for a specific index', async () => {
      const { wallet } = setup();
      const groupIndex = 2;
      const multichainAccount = await setupMultichainAccount({
        wallet,
        groupIndex,
      });

      expect(multichainAccount.index).toBe(groupIndex);
    });

    it('gets internal account from its id', async () => {
      const { wallet } = setup();
      const multichainAccount = await setupMultichainAccount({ wallet });

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
      async ({ selector, expected }) => {
        const { wallet } = setup();
        const multichainAccount = await setupMultichainAccount({ wallet });

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
    }[])(
      'gets undefined if not matching selector: $tc',
      async ({ selector }) => {
        const { wallet } = setup();
        const multichainAccount = await setupMultichainAccount({ wallet });

        expect(multichainAccount.get(selector)).toBeUndefined();
      },
    );

    it('throws if multiple candidates are found', async () => {
      const { wallet } = setup();
      const multichainAccount = await setupMultichainAccount({ wallet });

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
        expected: [mockBtcP2wpkhAccount, mockBtcP2trAccount],
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
        expected: [mockBtcP2wpkhAccount, mockBtcP2trAccount],
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
      async ({ selector, expected }) => {
        const { wallet } = setup();
        const multichainAccount = await setupMultichainAccount({ wallet });

        expect(multichainAccount.select(selector)).toStrictEqual(expected);
      },
    );
  });

  describe('MultichainAccountWallet', () => {
    it('constructs a multichain account wallet', async () => {
      const entropySource = mockEntropySource;
      const wallet = await setupMultichainAccountWallet({
        entropySource,
      });

      const expectedWalletId = toMultichainAccountWalletId(entropySource);
      expect(wallet.id).toStrictEqual(expectedWalletId);
      expect(wallet.accounts).toHaveLength(1); // All internal accounts are using index 0, so it means only 1 multichain account.
      expect(wallet.entropySource).toStrictEqual(entropySource);
    });

    it('creates a new multichain account with the next index', async () => {
      const index = 1;
      const providers = setupAccountProviders();
      const wallet = await setupMultichainAccountWallet({ providers });

      const multichainAccount = await wallet.createMultichainAccount(index);

      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(wallet.id, index),
      );
      expect(multichainAccount.index).toBe(index);
      expect(multichainAccount.accounts).toHaveLength(4); // EVM + SOL + 2 BTC.
    });

    it('creates a new multichain account with the next index automatically', async () => {
      const providers = setupAccountProviders();
      const wallet = await setupMultichainAccountWallet({ providers });

      const index = wallet.getNextGroupIndex();
      const multichainAccount = await wallet.createNextMultichainAccount();

      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(wallet.id, index),
      );
      expect(multichainAccount.index).toBe(index);
      expect(multichainAccount.accounts).toHaveLength(4); // EVM + SOL + 2 BTC.
    });

    it('returns the same multichain account if index already exist', async () => {
      const wallet = await setupMultichainAccountWallet();

      const multichainAccount = await wallet.createNextMultichainAccount();
      const sameMultichainAccount = await wallet.createMultichainAccount(
        multichainAccount.index,
      );

      expect(sameMultichainAccount).toStrictEqual(multichainAccount);
    });

    it('throws if using an index higher than the next available one', async () => {
      const wallet = await setupMultichainAccountWallet();

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
      const evmAccountProvider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const btcAccountProvider = new MockAccountProvider(
        () => [mockBtcP2wpkhAccount],
        [mockBtcP2wpkhAccount],
      ); // Only native-segwit for now.
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = await setupMultichainAccountWallet({ providers });

      // Each providers create 1 account, so both length must match.
      const multichainAccount = await wallet.createNextMultichainAccount();
      expect(multichainAccount.accounts).toHaveLength(providers.length);

      // Re-use old accounts that are already part of the multichain account.
      const oldBtcAccounts = btcAccountProvider.createAccounts.mock.results.at(
        -1,
      )?.value as Promise<KeyringAccount[]>;
      expect(oldBtcAccounts).toBeDefined();

      // Now update one of the provider to return 2 accounts instead of 1.
      btcAccountProvider.createAccounts.mockImplementation(
        async (args: Parameters<AccountProvider['createAccounts']>[0]) => {
          const btcP2trAccountProvider = new MockAccountProvider(
            () => [mockBtcP2trAccount],
            [mockBtcP2trAccount],
          );

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
      const evmAccountProvider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const btcAccountProvider = new MockAccountProvider(
        () => [mockBtcP2wpkhAccount],
        [mockBtcP2wpkhAccount],
      );
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = await setupMultichainAccountWallet({ providers });

      const accounts = await wallet.discoverAndCreateMultichainAccounts();
      expect(accounts).toHaveLength(1); // We only discover for index 0 in the test setup.
    });

    it('discovers accounts and create missing accounts if one provider did not discovered any account', async () => {
      const evmAccountProvider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const btcAccountProvider = new MockAccountProvider(
        () => [mockBtcP2wpkhAccount],
        [], // No account to discover.
      );
      const providers = [evmAccountProvider, btcAccountProvider];
      const wallet = await setupMultichainAccountWallet({ providers });

      const accounts = await wallet.discoverAndCreateMultichainAccounts();
      expect(accounts).toHaveLength(1); // We only discover for index 0 in the test setup.
      expect(accounts[0]?.accounts).toHaveLength(2); // EVM + BTC.
    });
  });
});
