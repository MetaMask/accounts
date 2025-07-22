/* eslint-disable jsdoc/require-jsdoc */

import type {
  EntropySourceId,
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
  SolAccountType,
  SolMethod,
  SolScope,
} from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { v4 as uuid } from 'uuid';

import type {
  AccountGroup,
  AccountGroupId,
  AccountProvider,
  AccountWallet,
  MultichainAccountId,
  AccountSelector,
  Bip44Account,
} from './api';
import {
  AccountWalletCategory,
  toAccountGroupId,
  toAccountWalletId,
  toDefaultAccountGroupId,
  toMultichainAccountId,
  toMultichainAccountWalletId,
  MultichainAccount,
  MultichainAccountWallet,
  getGroupIndexFromMultichainAccountId,
  isBip44Account,
} from './api';

type MockedAccount = Bip44Account<InternalAccount>;

const mockEntropySource = 'mock-entropy-source';

const mockAccountOptions = {
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

class MockAccountProvider implements AccountProvider<MockedAccount> {
  readonly #createAccounts: () => MockedAccount[];

  readonly #accounts: MockedAccount[];

  constructor(
    createAccounts: () => MockedAccount[],
    accounts: MockedAccount[],
  ) {
    this.#createAccounts = createAccounts;
    this.#accounts = accounts;
  }

  get accounts(): MockedAccount[] {
    return this.#accounts;
  }

  getAccounts = jest.fn().mockImplementation((): MockedAccount[] => {
    return this.#accounts;
  });

  getAccount = jest.fn().mockImplementation((id: MockedAccount['id']) => {
    // Assuming this never fails.
    return this.#accounts.find((account) => account.id === id);
  });

  createAccounts = jest
    .fn()
    .mockImplementation(
      async ({ entropySource, groupIndex }): Promise<MockedAccount['id'][]> => {
        const accounts = this.#createAccounts().map((baseAccount) => {
          // Deep copy existing account.
          const account: MockedAccount = JSON.parse(
            JSON.stringify(baseAccount),
          );

          if (
            !account.options.entropy ||
            account.options.entropy.type !==
              KeyringAccountEntropyTypeOption.Mnemonic
          ) {
            throw new Error('Invalid HD account');
          }

          account.id = uuid();
          account.address += `+${groupIndex}`; // Adds the index to the address to make it unique.
          account.options.entropy.id = entropySource;
          account.options.entropy.groupIndex = groupIndex;
          account.metadata.name += ` + ${groupIndex}`; // Same for the name.

          return account;
        });

        for (const account of accounts) {
          this.#accounts.push(account);
        }

        return accounts.map((account) => account.id);
      },
    );

  discoverAndCreateAccounts = jest
    .fn()
    .mockImplementation(
      async ({ groupIndex }): Promise<MockedAccount['id'][]> => {
        return this.#accounts
          .flatMap((account) => account)
          .filter(
            (account) => account.options.entropy.groupIndex === groupIndex,
          )
          .map((account) => account.id);
      },
    );
}
function setupAccountProviders(): MockAccountProvider[] {
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
  wallet: MultichainAccountWallet<MockedAccount>;
  groupIndex?: number;
  providers?: AccountProvider<MockedAccount>[];
}): Promise<MultichainAccount<MockedAccount>> {
  return new MultichainAccount({
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
  providers?: AccountProvider<MockedAccount>[];
  init?: boolean;
} = {}): Promise<MultichainAccountWallet<MockedAccount>> {
  return new MultichainAccountWallet({
    providers,
    entropySource,
  });
}

describe('index', () => {
  describe('MultichainAccount', () => {
    const setup = (): {
      wallet: MultichainAccountWallet<MockedAccount>;
      providers: MockAccountProvider[];
    } => {
      const providers = setupAccountProviders();
      const wallet = new MultichainAccountWallet<MockedAccount>({
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
      const expectedAccounts = providers.flatMap(
        (provider) => provider.accounts, // Use internal accounts.
      );
      expect(multichainAccount.id).toStrictEqual(
        toMultichainAccountId(expectedWalletId, groupIndex),
      );
      expect(multichainAccount.index).toBe(groupIndex);
      expect(multichainAccount.wallet).toStrictEqual(wallet);
      expect(multichainAccount.getAccounts()).toHaveLength(
        expectedAccounts.length,
      );
      expect(multichainAccount.getAccounts()).toStrictEqual(expectedAccounts);
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

    it('returns undefined if the account ID does not belong to the multichain account', async () => {
      const { wallet } = setup();
      const multichainAccount = await setupMultichainAccount({ wallet });

      expect(multichainAccount.getAccount('unknown-id')).toBeUndefined();
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
      selector: AccountSelector<MockedAccount>;
      expected: MockedAccount;
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
      selector: AccountSelector<MockedAccount>;
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
      {
        tc: 'using multiple selectors',
        selector: {
          type: EthAccountType.Eoa,
          methods: [EthMethod.SignTransaction, EthMethod.PersonalSign],
        },
        expected: [mockEvmAccount],
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
      selector: AccountSelector<MockedAccount>;
      expected: MockedAccount[];
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
      expect(wallet.entropySource).toStrictEqual(entropySource);
      expect(wallet.getMultichainAccounts()).toHaveLength(1); // All internal accounts are using index 0, so it means only 1 multichain account.
    });

    it('gets a multichain account from its index', async () => {
      const wallet = await setupMultichainAccountWallet();

      const groupIndex = 0;
      const multichainAccount = wallet.getMultichainAccount(groupIndex);
      expect(multichainAccount).toBeDefined();
      expect(multichainAccount?.index).toBe(groupIndex);
    });

    it('force sync wallet after account provider got new account', async () => {
      const provider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const wallet = await setupMultichainAccountWallet({
        providers: [provider],
      });

      expect(wallet.getMultichainAccounts()).toHaveLength(1);

      // Add a new account for the next index.
      provider.getAccounts.mockReturnValue([
        mockEvmAccount,
        {
          ...mockEvmAccount,
          options: {
            ...mockEvmAccount.options,
            entropy: {
              ...mockEvmAccount.options.entropy,
              groupIndex: 1,
            },
          },
        },
      ]);

      // Force sync, so the wallet will "find" a new multichain account.
      wallet.sync();
      expect(wallet.getMultichainAccounts()).toHaveLength(2);
    });

    it('skips non-matching wallet during sync', async () => {
      const provider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const wallet = await setupMultichainAccountWallet({
        providers: [provider],
      });

      expect(wallet.getMultichainAccounts()).toHaveLength(1);

      // Add a new account for another index but not for this wallet.
      provider.getAccounts.mockReturnValue([
        mockEvmAccount,
        {
          ...mockEvmAccount,
          options: {
            ...mockEvmAccount.options,
            entropy: {
              ...mockEvmAccount.options.entropy,
              id: 'mock-unknown-entropy-id',
              groupIndex: 1,
            },
          },
        },
      ]);

      // Even if we have a new account, it's not for this wallet, so it should
      // not create a new multichain account!
      wallet.sync();
      expect(wallet.getMultichainAccounts()).toHaveLength(1);
    });

    it('cleans up old multichain account during sync', async () => {
      const provider = new MockAccountProvider(
        () => [mockEvmAccount],
        [mockEvmAccount],
      );
      const wallet = await setupMultichainAccountWallet({
        providers: [provider],
      });

      expect(wallet.getMultichainAccounts()).toHaveLength(1);

      // Account for index 0 got removed, thus, the multichain account for index 0
      // will also be removed.
      provider.getAccounts.mockReturnValue([]);

      // We should not have any multichain account anymore.
      wallet.sync();
      expect(wallet.getMultichainAccounts()).toHaveLength(0);
    });
  });

  describe('AccountGroup', () => {
    it('gets an account from it account id', async () => {
      // MultichainAccountWallet is also an AccountWallet, so we can use it to
      // test AccountGroup too!
      // NOTE: Force types, to make sure multichain adapters can be
      // used through those.
      const wallet: AccountWallet<MockedAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toAccountGroupId(wallet.id, '0'); // Use number as a string here.
      const group: AccountGroup<MockedAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeDefined();
      expect(group?.id).toStrictEqual(groupId);
    });

    it('gets the default account when using the default group id', async () => {
      const wallet: AccountWallet<MockedAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toDefaultAccountGroupId(wallet.id);
      const group: AccountGroup<MockedAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeDefined();

      // We know it's safe, since we're using a MultichainAccountWallet
      const multichainAccount = group as MultichainAccount<MockedAccount>;
      expect(multichainAccount.index).toBe(0); // Default group ID is referring to index 0.
    });

    it('returns undefined if we cannot match the account group id', async () => {
      const wallet: AccountWallet<MockedAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toAccountGroupId(
        toAccountWalletId(AccountWalletCategory.Keyring, 'bad-keyring-id'),
        'bad-index',
      );
      const group: AccountGroup<MockedAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeUndefined();
    });

    it('gets accounts', async () => {
      const wallet = await setupMultichainAccountWallet();
      const groups: AccountGroup<MockedAccount>[] = wallet.getAccountGroups();

      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('AccountWallet', () => {
    it('uses a compatible wallet id', async () => {
      // MultichainAccountWallet is also an AccountWallet, so we can use it to
      // test AccountGroup too!
      const wallet = await setupMultichainAccountWallet();

      expect(wallet.category).toBe(AccountWalletCategory.Entropy);
      expect(wallet.id).toStrictEqual(
        toAccountWalletId(AccountWalletCategory.Entropy, wallet.entropySource),
      );
    });
  });

  describe('toAccountGroupId', () => {
    it('converts an account wallet id and a unique id to a group id', () => {
      const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
      const groupId = toAccountGroupId(walletId, 'test');

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });

  describe('toDefaultAccountGroupId', () => {
    it('converts an account wallet id and to the default group id', () => {
      const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
      const groupId = toDefaultAccountGroupId(walletId);

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });

  describe('getGroupIndexFromMultichainAccountId', () => {
    it('throws if it cannot extract group index', () => {
      const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
      const groupId = toAccountGroupId(walletId, 'test');

      expect(() =>
        getGroupIndexFromMultichainAccountId(
          // Force the error case even though, type wise, this should not
          // be possible!
          groupId as unknown as MultichainAccountId,
        ),
      ).toThrow('Unable to extract group index');
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
});
