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

import type { TrezorBridge } from './trezor-bridge';
import { TrezorKeyring } from './trezor-keyring';
import { TrezorKeyringV2 } from './trezor-keyring-v2';

/**
 * Type alias for Trezor keyring accounts (always BIP-44 derived).
 */
type TrezorAccount = Bip44Account<KeyringAccount>;

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
 * Fake entropy source representing the device fingerprint.
 */
const entropySource = 'trezor-device-12345';

/**
 * Expected methods supported by Trezor keyring accounts.
 */
const EXPECTED_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
];

/**
 * Get the first account from an array, throwing if empty.
 *
 * @param accounts - The accounts array.
 * @returns The first account.
 */
function getFirstAccount(accounts: TrezorAccount[]): TrezorAccount {
  if (accounts.length === 0) {
    throw new Error('Expected at least one account');
  }
  return accounts[0] as TrezorAccount;
}

/**
 * Get an account at a specific index, throwing if not present.
 *
 * @param accounts - The accounts array.
 * @param index - The index to retrieve.
 * @returns The account at the index.
 */
function getAccountAt(accounts: TrezorAccount[], index: number): TrezorAccount {
  if (accounts.length <= index) {
    throw new Error(`Expected account at index ${index}`);
  }
  return accounts[index] as TrezorAccount;
}

/**
 * Get a mock bridge for the TrezorKeyring.
 *
 * @returns A mock bridge.
 */
function getMockBridge(): TrezorBridge {
  return {
    init: jest.fn(),
    dispose: jest.fn(),
    getPublicKey: jest.fn(),
    ethereumSignTransaction: jest.fn(),
    ethereumSignMessage: jest.fn(),
    ethereumSignTypedData: jest.fn(),
    model: undefined,
  } as unknown as TrezorBridge;
}

/**
 * Create a TrezorKeyring with the fake HD key.
 *
 * @returns The inner keyring.
 */
function createInnerKeyring(): TrezorKeyring {
  const inner = new TrezorKeyring({ bridge: getMockBridge() });
  // Set up the HDKey so accounts can be derived without unlocking
  inner.hdk = fakeHdKey;
  return inner;
}

/**
 * Create a TrezorKeyringV2 wrapper with accounts.
 *
 * @param accountCount - Number of accounts to add.
 * @returns The wrapper and inner keyring.
 */
async function createWrapperWithAccounts(accountCount = 3): Promise<{
  wrapper: TrezorKeyringV2;
  inner: TrezorKeyring;
}> {
  const inner = createInnerKeyring();
  inner.setAccountToUnlock(0);
  await inner.addAccounts(accountCount);

  const wrapper = new TrezorKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Create a TrezorKeyringV2 wrapper without any accounts.
 *
 * @returns The wrapper and inner keyring.
 */
function createEmptyWrapper(): {
  wrapper: TrezorKeyringV2;
  inner: TrezorKeyring;
} {
  const inner = createInnerKeyring();
  const wrapper = new TrezorKeyringV2({ legacyKeyring: inner, entropySource });
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

describe('TrezorKeyringV2', () => {
  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      const { wrapper } = createEmptyWrapper();

      expect(wrapper.type).toBe(KeyringType.Trezor);
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

    it('creates KeyringAccount objects with correct structure', async () => {
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
            derivationPath: `m/44'/60'/0'/0/0`,
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

    it('uses paths map when available for faster lookup', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Manually populate the paths map (simulating what getFirstPage does)
      inner.paths[EXPECTED_ACCOUNTS[0]] = 0;

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account.options.entropy.groupIndex).toBe(0);
    });

    it('throws error when address cannot be found', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Mock the private derive method to speed up the test
      // by preventing the 1000 iteration loop
      jest.spyOn(inner.hdk, 'derive').mockImplementation(() => {
        // Return an HDKey that produces a different address
        const differentHdKey = HDKey.fromExtendedKey(
          'xpub661MyMwAqRbcFtXgS5sYJABqqG9YLmC4Q1Rdap9gSE8NqtwybGhePY2gZ29ESFjqJoCu1Rupje8YtGqsefD265TMg7usUDFdp6W1EGMcet8',
        );
        return differentHdKey;
      });

      // Clear paths to force the fallback derivation loop
      inner.paths = {};

      await expect(wrapper.getAccounts()).rejects.toThrow(/Unknown address/u);
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state without crashing when device is locked', async () => {
      // Create a keyring WITHOUT pre-initializing hdk (simulating production)
      const inner = new TrezorKeyring({ bridge: getMockBridge() });
      const wrapper = new TrezorKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      // Verify the device is locked (hdk not initialized)
      expect(inner.isUnlocked()).toBe(false);

      // Deserialize with accounts pre-set - this should NOT crash
      // even though hdk is not initialized
      await wrapper.deserialize({
        hdPath: `m/44'/60'/0'/0`,
        accounts: [
          EXPECTED_ACCOUNTS[0],
          EXPECTED_ACCOUNTS[1],
          EXPECTED_ACCOUNTS[2],
        ],
        page: 0,
        perPage: 5,
      });

      // The inner keyring now has accounts restored
      const innerAccounts = await inner.getAccounts();
      expect(innerAccounts).toHaveLength(3);

      // Device is still locked
      expect(inner.isUnlocked()).toBe(false);
    });

    it('rebuilds registry when getAccounts is called after device is unlocked', async () => {
      const inner = createInnerKeyring();
      const wrapper = new TrezorKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      // Deserialize with accounts pre-set
      await wrapper.deserialize({
        hdPath: `m/44'/60'/0'/0`,
        accounts: [
          EXPECTED_ACCOUNTS[0],
          EXPECTED_ACCOUNTS[1],
          EXPECTED_ACCOUNTS[2],
        ],
        page: 0,
        perPage: 5,
      });

      // Since inner.hdk is pre-initialized in createInnerKeyring(),
      // getAccounts should work and populate the registry
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts[0]?.address).toBe(EXPECTED_ACCOUNTS[0]);
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
        'Unsupported account creation type for TrezorKeyring: private-key:import',
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

  describe('different HD paths', () => {
    it('uses the correct derivation path from the inner keyring', async () => {
      const inner = createInnerKeyring();
      inner.setHdPath(`m/44'/60'/0'`); // Legacy MEW path
      inner.hdk = fakeHdKey; // Reset after setHdPath clears it
      inner.setAccountToUnlock(0);
      await inner.addAccounts(1);

      const wrapper = new TrezorKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account.options.entropy.derivationPath).toBe(`m/44'/60'/0'/0`);
    });
  });
});
