import type { Bip44Account } from '@metamask/account-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  type KeyringAccount,
  KeyringAccountEntropyTypeOption,
  KeyringType,
} from '@metamask/keyring-api';
import HDKey from 'hdkey';

import type { LedgerBridge, LedgerBridgeOptions } from './ledger-bridge';
import { LedgerIframeBridge } from './ledger-iframe-bridge';
import { LedgerKeyring } from './ledger-keyring';
import { LedgerKeyringV2 } from './ledger-keyring-v2';

/**
 * Type alias for Ledger keyring accounts (always BIP-44 derived).
 */
type LedgerAccount = Bip44Account<KeyringAccount>;

/**
 * Test addresses derived from the fake HD key.
 */
const EXPECTED_ACCOUNTS = [
  '0xF30952A1c534CDE7bC471380065726fa8686dfB3',
  '0x44fe3Cf56CaF651C4bD34Ae6dbcffa34e9e3b84B',
  '0x8Ee3374Fa705C1F939715871faf91d4348D5b906',
  '0xEF69e24dE9CdEe93C4736FE29791E45d5D4CFd6A',
  '0xC668a5116A045e9162902795021907Cb15aa2620',
  '0xbF519F7a6D8E72266825D770C60dbac55a3baeb9',
] as const;

const fakeXPubKey =
  'xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt';
const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKey);

/**
 * Fake entropy source representing the device ID.
 */
const entropySource = 'ledger-device-12345';

/**
 * Expected methods supported by Ledger keyring accounts.
 */
const EXPECTED_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV4,
];

/**
 * Get the first account from an array, throwing if empty.
 *
 * @param accounts - The accounts array.
 * @returns The first account.
 */
function getFirstAccount(accounts: LedgerAccount[]): LedgerAccount {
  if (accounts.length === 0) {
    throw new Error('Expected at least one account');
  }
  return accounts[0] as LedgerAccount;
}

/**
 * Get an account at a specific index, throwing if not present.
 *
 * @param accounts - The accounts array.
 * @param index - The index to retrieve.
 * @returns The account at the index.
 */
function getAccountAt(accounts: LedgerAccount[], index: number): LedgerAccount {
  if (accounts.length <= index) {
    throw new Error(`Expected account at index ${index}`);
  }
  return accounts[index] as LedgerAccount;
}

/**
 * Create a LedgerKeyring with the fake HD key (legacy path).
 *
 * @returns The inner keyring.
 */
function createInnerKeyring(): LedgerKeyring {
  const bridge = new LedgerIframeBridge();
  const inner = new LedgerKeyring({ bridge });
  // Set up the HDKey so accounts can be derived without unlocking
  inner.hdk = fakeHdKey;
  return inner;
}

/**
 * Create a mock bridge for Ledger Live path testing.
 *
 * @returns A mock bridge.
 */
function getMockBridge(): LedgerBridge<LedgerBridgeOptions> {
  return {
    init: jest.fn(),
    destroy: jest.fn(),
    getPublicKey: jest.fn(),
    deviceSignTransaction: jest.fn(),
    deviceSignMessage: jest.fn(),
    deviceSignTypedData: jest.fn(),
    updateTransportMethod: jest.fn(),
    attemptMakeApp: jest.fn(),
    isDeviceConnected: false,
  } as unknown as LedgerBridge<LedgerBridgeOptions>;
}

/**
 * Create a LedgerKeyringV2 wrapper with accounts (using legacy path).
 *
 * @param accountCount - Number of accounts to add.
 * @returns The wrapper and inner keyring.
 */
async function createWrapperWithAccounts(accountCount = 3): Promise<{
  wrapper: LedgerKeyringV2;
  inner: LedgerKeyring;
}> {
  const inner = createInnerKeyring();
  inner.setAccountToUnlock(0);
  await inner.addAccounts(accountCount);

  const wrapper = new LedgerKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Create a LedgerKeyringV2 wrapper without any accounts.
 *
 * @returns The wrapper and inner keyring.
 */
function createEmptyWrapper(): {
  wrapper: LedgerKeyringV2;
  inner: LedgerKeyring;
} {
  const inner = createInnerKeyring();
  const wrapper = new LedgerKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Helper to create account options for bip44:derive-index.
 *
 * @param groupIndex - The group index to derive.
 * @param source - Optional entropy source override.
 * @returns The create account options.
 */
function deriveIndexOptions(
  groupIndex: number,
  source: string = entropySource,
): {
  type: 'bip44:derive-index';
  entropySource: string;
  groupIndex: number;
} {
  return {
    type: 'bip44:derive-index' as const,
    entropySource: source,
    groupIndex,
  };
}

describe('LedgerKeyringV2', () => {
  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      const { wrapper } = createEmptyWrapper();

      expect(wrapper.type).toBe(KeyringType.Ledger);
      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        bip44: {
          deriveIndex: true,
          derivePath: false,
          discover: false,
        },
      });
    });
  });

  describe('getAccounts', () => {
    it('returns empty array when no accounts exist', async () => {
      const { wrapper } = createEmptyWrapper();

      const accounts = await wrapper.getAccounts();

      expect(accounts).toStrictEqual([]);
    });

    it('returns all accounts from the legacy keyring', async () => {
      const { wrapper } = await createWrapperWithAccounts(3);

      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(3);
      expect(accounts.map((a) => a.address)).toStrictEqual(
        EXPECTED_ACCOUNTS.slice(0, 3),
      );
    });

    it('creates KeyringAccount objects with correct structure (legacy path)', async () => {
      const { wrapper } = await createWrapperWithAccounts(1);

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account).toMatchObject({
        type: EthAccountType.Eoa,
        address: EXPECTED_ACCOUNTS[0],
        scopes: [EthScope.Eoa],
        methods: EXPECTED_METHODS,
        options: {
          entropy: {
            type: KeyringAccountEntropyTypeOption.Mnemonic,
            id: entropySource,
            groupIndex: 0,
            derivationPath: `m/44'/60'/0'/0`,
          },
        },
      });
      expect(account.id).toBeDefined();
    });

    it('caches KeyringAccount objects', async () => {
      const { wrapper } = await createWrapperWithAccounts(1);

      const accounts1 = await wrapper.getAccounts();
      const accounts2 = await wrapper.getAccounts();

      expect(accounts1[0]).toBe(accounts2[0]);
    });

    it('returns correct groupIndex for multiple accounts', async () => {
      const { wrapper } = await createWrapperWithAccounts(3);

      const accounts = await wrapper.getAccounts();

      accounts.forEach((account, index) => {
        expect(account.options.entropy.groupIndex).toBe(index);
      });
    });

    it('throws error when address is not found in account details', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Clear account details to simulate inconsistent state
      inner.accountDetails = {};

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /not found in account details/u,
      );
    });

    it('throws error when hdPath is undefined in account details', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Set account details without hdPath
      inner.accountDetails[EXPECTED_ACCOUNTS[0]] = {
        bip44: false,
        // hdPath is intentionally omitted
      };

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /No HD path found for address/u,
      );
    });

    it('throws error when hdPath does not match expected patterns', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Set account details with an invalid/unexpected hdPath format
      inner.accountDetails[EXPECTED_ACCOUNTS[0]] = {
        bip44: false,
        hdPath: `m/44'/60'/0'`, // Missing the index part
      };

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /Could not extract index from HD path/u,
      );
    });

    it('throws error when Ledger Live hdPath does not match expected pattern', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Set account details with an invalid Ledger Live hdPath format
      inner.accountDetails[EXPECTED_ACCOUNTS[0]] = {
        bip44: true,
        hdPath: `m/44'/60'/0'`, // Invalid Ledger Live path (missing /0/0)
      };

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /Could not extract index from HD path/u,
      );
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state', async () => {
      const inner = createInnerKeyring();
      const wrapper = new LedgerKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      // Deserialize with accounts and account details
      await wrapper.deserialize({
        hdPath: `m/44'/60'/0'`,
        accounts: [
          EXPECTED_ACCOUNTS[0],
          EXPECTED_ACCOUNTS[1],
          EXPECTED_ACCOUNTS[2],
        ],
        accountDetails: {
          [EXPECTED_ACCOUNTS[0]]: { bip44: false, hdPath: `m/44'/60'/0'/0` },
          [EXPECTED_ACCOUNTS[1]]: { bip44: false, hdPath: `m/44'/60'/0'/1` },
          [EXPECTED_ACCOUNTS[2]]: { bip44: false, hdPath: `m/44'/60'/0'/2` },
        },
      });

      const innerAccounts = await inner.getAccounts();
      expect(innerAccounts).toHaveLength(3);
    });

    it('clears the cache and rebuilds it', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const accountsBefore = await wrapper.getAccounts();
      expect(accountsBefore).toHaveLength(2);

      await wrapper.deserialize({
        hdPath: `m/44'/60'/0'`,
        accounts: [
          EXPECTED_ACCOUNTS[0],
          EXPECTED_ACCOUNTS[1],
          EXPECTED_ACCOUNTS[2],
        ],
        accountDetails: {
          [EXPECTED_ACCOUNTS[0]]: { bip44: false, hdPath: `m/44'/60'/0'/0` },
          [EXPECTED_ACCOUNTS[1]]: { bip44: false, hdPath: `m/44'/60'/0'/1` },
          [EXPECTED_ACCOUNTS[2]]: { bip44: false, hdPath: `m/44'/60'/0'/2` },
        },
      });

      const accountsAfter = await wrapper.getAccounts();
      expect(accountsAfter).toHaveLength(3);
      // The accounts should be new objects (cache was cleared)
      expect(accountsAfter[0]).not.toBe(accountsBefore[0]);
    });
  });

  describe('createAccounts', () => {
    it('creates the first account at index 0', async () => {
      const { wrapper } = createEmptyWrapper();

      const newAccounts = await wrapper.createAccounts(deriveIndexOptions(0));
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[0]);
    });

    it('creates an account at a specific index', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const newAccounts = await wrapper.createAccounts(deriveIndexOptions(2));
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[2]);
    });

    it('returns existing account if groupIndex already exists', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const existingAccounts = await wrapper.getAccounts();
      const existingAccount = getFirstAccount(existingAccounts);
      const newAccounts = await wrapper.createAccounts(deriveIndexOptions(0));
      const returnedAccount = getFirstAccount(newAccounts);

      expect(returnedAccount).toBe(existingAccount);
    });

    it('throws error for unsupported account creation type', async () => {
      const { wrapper } = await createWrapperWithAccounts(0);

      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: 'hexadecimal',
          privateKey: '0xabc',
        }),
      ).rejects.toThrow(
        'Unsupported account creation type for LedgerKeyring: private-key:import',
      );
    });

    it('throws error for entropy source mismatch', async () => {
      const { wrapper } = await createWrapperWithAccounts(0);

      await expect(
        wrapper.createAccounts(deriveIndexOptions(0, 'wrong-entropy')),
      ).rejects.toThrow(/Entropy source mismatch/u);
    });

    it('allows deriving accounts at any index (non-sequential)', async () => {
      const { wrapper } = createEmptyWrapper();

      const newAccounts = await wrapper.createAccounts(deriveIndexOptions(5));
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[5]);
      expect(account.options.entropy.groupIndex).toBe(5);
    });

    it('creates multiple accounts sequentially', async () => {
      const { wrapper } = createEmptyWrapper();

      const results = await Promise.all([
        wrapper.createAccounts(deriveIndexOptions(0)),
        wrapper.createAccounts(deriveIndexOptions(1)),
        wrapper.createAccounts(deriveIndexOptions(2)),
      ]);

      results.forEach((accounts, index) => {
        const account = getFirstAccount(accounts);
        expect(account.address).toBe(EXPECTED_ACCOUNTS[index]);
      });
    });

    it('throws error when inner keyring fails to create account', async () => {
      const { wrapper, inner } = createEmptyWrapper();

      jest.spyOn(inner, 'addAccounts').mockResolvedValueOnce([]);

      await expect(
        wrapper.createAccounts(deriveIndexOptions(0)),
      ).rejects.toThrow('Failed to create new account');
    });

    it('throws error when accountDetails is missing after creating account', async () => {
      const { wrapper, inner } = createEmptyWrapper();

      // Mock addAccounts to add an account but not populate accountDetails at all
      const originalAddAccounts = inner.addAccounts.bind(inner);
      jest
        .spyOn(inner, 'addAccounts')
        .mockImplementationOnce(async (numberOfAccounts) => {
          const addresses = await originalAddAccounts(numberOfAccounts);
          // Remove the entire accountDetails entry to simulate inconsistent state
          const checksumAddress = addresses[0];
          if (checksumAddress) {
            delete inner.accountDetails[checksumAddress];
          }
          return addresses;
        });

      await expect(
        wrapper.createAccounts(deriveIndexOptions(0)),
      ).rejects.toThrow(/No HD path found for address/u);
    });
  });

  describe('deleteAccount', () => {
    it('removes an account from the keyring', async () => {
      const { wrapper } = await createWrapperWithAccounts(3);

      const accountsBefore = await wrapper.getAccounts();
      const accountToDelete = getAccountAt(accountsBefore, 1);

      await wrapper.deleteAccount(accountToDelete.id);

      const accountsAfter = await wrapper.getAccounts();
      expect(accountsAfter).toHaveLength(2);
      expect(accountsAfter.map((a) => a.address)).not.toContain(
        accountToDelete.address,
      );
    });

    it('removes the account from the cache', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const accounts = await wrapper.getAccounts();
      const accountToDelete = getFirstAccount(accounts);

      await wrapper.deleteAccount(accountToDelete.id);

      await expect(wrapper.getAccount(accountToDelete.id)).rejects.toThrow(
        /Account not found/u,
      );
    });

    it('throws error for non-existent account', async () => {
      const { wrapper } = await createWrapperWithAccounts(1);

      await expect(wrapper.deleteAccount('non-existent-id')).rejects.toThrow(
        /Account not found/u,
      );
    });
  });

  describe('getAccount', () => {
    it('returns the account by ID', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const accounts = await wrapper.getAccounts();
      const expectedAccount = getFirstAccount(accounts);
      const account = await wrapper.getAccount(expectedAccount.id);

      expect(account).toBe(expectedAccount);
    });

    it('throws error for non-existent account', async () => {
      const { wrapper } = await createWrapperWithAccounts(1);

      await expect(wrapper.getAccount('non-existent-id')).rejects.toThrow(
        /Account not found/u,
      );
    });
  });

  describe('serialize', () => {
    it('serializes the legacy keyring state', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(2);

      const wrapperSerialized = await wrapper.serialize();
      const innerSerialized = await inner.serialize();

      expect(wrapperSerialized).toStrictEqual(innerSerialized);
    });
  });

  describe('Ledger Live path (BIP-44)', () => {
    /**
     * Create a wrapper with Ledger Live path accounts.
     *
     * @param accountCount - Number of accounts to add.
     * @returns The wrapper and inner keyring.
     */
    async function createLedgerLiveWrapper(accountCount = 1): Promise<{
      wrapper: LedgerKeyringV2;
      inner: LedgerKeyring;
    }> {
      const bridge = getMockBridge();
      const inner = new LedgerKeyring({ bridge });

      // Set up the Ledger Live path
      inner.setHdPath(`m/44'/60'/0'/0/0`);

      // Mock unlock to return addresses for Ledger Live path
      jest
        .spyOn(inner, 'unlock')
        .mockImplementation(async (hdPath?: string): Promise<`0x${string}`> => {
          if (hdPath) {
            // Extract index from Ledger Live path: m/44'/60'/{index}'/0/0
            const match = hdPath.match(/^m\/44'\/60'\/(\d+)'\/0\/0$/u);
            if (match?.[1]) {
              const index = parseInt(match[1], 10);
              const account = EXPECTED_ACCOUNTS[index];
              if (account) {
                return account;
              }
            }
          }
          return EXPECTED_ACCOUNTS[0];
        });

      inner.setAccountToUnlock(0);
      await inner.addAccounts(accountCount);

      const wrapper = new LedgerKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      return { wrapper, inner };
    }

    it('creates accounts with Ledger Live derivation path', async () => {
      const { wrapper } = await createLedgerLiveWrapper(1);

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account.options.entropy.derivationPath).toBe(`m/44'/60'/0'/0/0`);
      expect(account.options.entropy.groupIndex).toBe(0);
    });

    it('extracts correct groupIndex from Ledger Live path', async () => {
      const { wrapper, inner } = await createLedgerLiveWrapper(1);

      // Add more accounts at different indexes
      inner.setAccountToUnlock(2);
      await inner.addAccounts(1);

      const accounts = await wrapper.getAccounts();

      // First account at index 0
      expect(accounts[0]?.options.entropy.groupIndex).toBe(0);
      // Second account at index 2
      expect(accounts[1]?.options.entropy.groupIndex).toBe(2);
    });
  });
});
