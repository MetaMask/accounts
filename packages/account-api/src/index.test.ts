/* eslint-disable jsdoc/require-jsdoc */

import type { EntropySourceId } from '@metamask/keyring-api';
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
import type { AccountId } from '@metamask/keyring-utils';
import { v4 as uuid } from 'uuid';

import type {
  AccountGroup,
  AccountGroupId,
  MultichainAccountProvider,
  AccountWallet,
  MultichainAccount,
  MultichainAccountSelector,
  MultichainAccountWallet,
} from './api';
import {
  AccountWalletCategory,
  toAccountGroupId,
  toAccountWalletId,
  toDefaultAccountGroupId,
  toMultichainAccountId,
  toMultichainAccountWalletId,
  MultichainAccountAdapter,
  MultichainAccountWalletAdapter,
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

class MockAccountProvider
  implements MultichainAccountProvider<InternalAccount>
{
  readonly #createAccounts: () => InternalAccount[];

  readonly #accounts: InternalAccount[];

  constructor(
    createAccounts: () => InternalAccount[],
    accounts: InternalAccount[],
  ) {
    this.#createAccounts = createAccounts;
    this.#accounts = accounts;
  }

  get accounts(): InternalAccount[] {
    return this.#accounts;
  }

  getAccount = jest.fn().mockImplementation((id): InternalAccount => {
    const found = this.#accounts.find((account) => account.id === id);

    if (!found) {
      throw new Error('Unknown account');
    }

    return found;
  });

  getAccounts = jest
    .fn()
    .mockImplementation(({ entropySource, groupIndex }): AccountId[] => {
      return this.#accounts
        .filter(
          (account) =>
            account.options.entropySource === entropySource &&
            account.options.index === groupIndex,
        )
        .map((account) => account.id);
    });

  createAccounts = jest
    .fn()
    .mockImplementation(
      async ({ entropySource, groupIndex }): Promise<AccountId[]> => {
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

        return accounts.map((account) => account.id);
      },
    );

  discoverAndCreateAccounts = jest
    .fn()
    .mockImplementation(async ({ groupIndex }): Promise<AccountId[]> => {
      return this.#accounts
        .flatMap((account) => account)
        .filter((account) => account.options.index === groupIndex)
        .map((account) => account.id);
    });
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
  wallet: MultichainAccountWallet<InternalAccount>;
  groupIndex?: number;
  providers?: MultichainAccountProvider<InternalAccount>[];
}): Promise<MultichainAccount<InternalAccount>> {
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
  providers?: MultichainAccountProvider<InternalAccount>[];
  init?: boolean;
} = {}): Promise<MultichainAccountWallet<InternalAccount>> {
  return new MultichainAccountWalletAdapter({
    providers,
    entropySource,
  });
}

describe('index', () => {
  describe('MultichainAccount', () => {
    const setup = (): {
      wallet: MultichainAccountWallet<InternalAccount>;
      providers: MockAccountProvider[];
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
  });

  describe('AccountGroup', () => {
    it('gets an account from it account id', async () => {
      // MultichainAccountWallet is also an AccountWallet, so we can use it to
      // test AccountGroup too!
      // NOTE: Force types, to make sure multichain adapters can be
      // used through those.
      const wallet: AccountWallet<InternalAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toAccountGroupId(wallet.id, '0'); // Use number as a string here.
      const group: AccountGroup<InternalAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeDefined();
      expect(group?.id).toStrictEqual(groupId);
    });

    it('gets the default account when using the default group id', async () => {
      const wallet: AccountWallet<InternalAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toDefaultAccountGroupId(wallet.id);
      const group: AccountGroup<InternalAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeDefined();

      // We know it's safe, since we're using a MultichainAccountWallet
      const multichainAccount = group as MultichainAccount<InternalAccount>;
      expect(multichainAccount.index).toBe(0); // Default group ID is referring to index 0.
    });

    it('returns undefined if we cannot match the account group id', async () => {
      const wallet: AccountWallet<InternalAccount> =
        await setupMultichainAccountWallet();

      const groupId: AccountGroupId = toAccountGroupId(
        toAccountWalletId(AccountWalletCategory.Keyring, 'bad-keyring-id'),
        'bad-index',
      );
      const group: AccountGroup<InternalAccount> | undefined =
        wallet.getAccountGroup(groupId);

      expect(group).toBeUndefined();
    });

    it('gets accounts', async () => {
      const wallet = await setupMultichainAccountWallet();
      const groups: AccountGroup<InternalAccount>[] = wallet.getAccountGroups();

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
    it('converts a account wallet id and a unique id to a group id', () => {
      const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
      const groupId = toAccountGroupId(walletId, 'test');

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });

  describe('toDefaultAccountGroupId', () => {
    it('converts a account wallet id and to the default group id', () => {
      const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
      const groupId = toDefaultAccountGroupId(walletId);

      expect(groupId.startsWith(walletId)).toBe(true);
    });
  });
});
