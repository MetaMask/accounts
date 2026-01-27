import type { Bip44Account } from '@metamask/account-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  type KeyringAccount,
  KeyringAccountEntropyTypeOption,
  KeyringType,
} from '@metamask/keyring-api';

import type { QrKeyringBridge } from '.';
import { QrKeyring } from '.';
import {
  QrKeyringV2,
  type QrKeyringCreateAccountOptions,
} from './qr-keyring-v2';
import {
  ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  EXPECTED_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  KNOWN_CRYPTO_ACCOUNT_UR,
  KNOWN_HDKEY_UR,
} from '../test/fixtures';

/**
 * Type alias for QR keyring HD mode accounts (BIP-44 derived).
 */
type QrHdAccount = Bip44Account<KeyringAccount>;

/**
 * Get the first account from an array, throwing if empty.
 *
 * @param accounts - The accounts array.
 * @returns The first account.
 */
function getFirstAccount(accounts: KeyringAccount[]): KeyringAccount {
  if (accounts.length === 0) {
    throw new Error('Expected at least one account');
  }
  return accounts[0] as KeyringAccount;
}

/**
 * Get the first HD mode account from an array, throwing if empty.
 *
 * @param accounts - The accounts array.
 * @returns The first account cast as QrHdAccount.
 */
function getFirstHdAccount(accounts: KeyringAccount[]): QrHdAccount {
  if (accounts.length === 0) {
    throw new Error('Expected at least one account');
  }
  return accounts[0] as QrHdAccount;
}

/**
 * Get an account at a specific index, throwing if not present.
 *
 * @param accounts - The accounts array.
 * @param index - The index to retrieve.
 * @returns The account at the index.
 */
function getAccountAt(
  accounts: KeyringAccount[],
  index: number,
): KeyringAccount {
  if (accounts.length <= index) {
    throw new Error(`Expected account at index ${index}`);
  }
  return accounts[index] as KeyringAccount;
}

const entropySource = HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS.xfp;

/**
 * Expected methods supported by QR keyring accounts.
 */
const EXPECTED_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV4,
];

/**
 * Get a mock bridge for the QrKeyring.
 *
 * @returns A mock bridge with a requestScan method.
 */
function getMockBridge(): QrKeyringBridge {
  return {
    requestScan: jest.fn(),
  };
}

/**
 * Create a fresh QrKeyring with HD mode device.
 *
 * @returns The inner keyring.
 */
function createInnerKeyring(): QrKeyring {
  return new QrKeyring({
    bridge: getMockBridge(),
    ur: KNOWN_HDKEY_UR,
  });
}

/**
 * Create a QrKeyringV2 wrapper with a paired HD mode device and accounts.
 *
 * @param accountCount - Number of accounts to add.
 * @returns The wrapper and inner keyring.
 */
async function createWrapperWithAccounts(accountCount = 3): Promise<{
  wrapper: QrKeyringV2;
  inner: QrKeyring;
}> {
  const inner = createInnerKeyring();
  await inner.addAccounts(accountCount);

  const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Create a QrKeyringV2 wrapper without any accounts.
 *
 * @returns The wrapper and inner keyring.
 */
function createEmptyWrapper(): { wrapper: QrKeyringV2; inner: QrKeyring } {
  const inner = createInnerKeyring();
  const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Create a QrKeyringV2 wrapper with a paired Account mode device.
 *
 * @returns The wrapper and inner keyring.
 */
async function createAccountModeWrapper(): Promise<{
  wrapper: QrKeyringV2;
  inner: QrKeyring;
}> {
  const inner = new QrKeyring({
    bridge: getMockBridge(),
    ur: KNOWN_CRYPTO_ACCOUNT_UR,
  });
  await inner.addAccounts(1);

  const wrapper = new QrKeyringV2({
    legacyKeyring: inner,
    entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
  });
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

/**
 * Helper to create custom account options for Account mode.
 *
 * @param addressIndex - The index of the pre-defined address.
 * @param source - Optional entropy source override.
 * @returns The create account options.
 */
function customAccountOptions(
  addressIndex: number,
  source: string = ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
): {
  type: 'custom';
  entropySource: string;
  addressIndex: number;
} {
  return {
    type: 'custom' as const,
    entropySource: source,
    addressIndex,
  };
}

describe('QrKeyringV2', () => {
  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      const { wrapper } = createEmptyWrapper();

      expect(wrapper.type).toBe(KeyringType.Qr);
      // Default capabilities when no device is paired
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
    it('returns correct capabilities immediately for pre-paired Account mode device', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_CRYPTO_ACCOUNT_UR,
      });
      await inner.addAccounts(1);

      const wrapper = new QrKeyringV2({
        legacyKeyring: inner,
        entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
      });

      // Capabilities are correct immediately - no need to call getAccounts first
      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        custom: {
          createAccounts: true,
        },
      });
    });
    it('returns empty array when no device is paired', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

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

    it('returns correct groupIndex for multiple accounts', async () => {
      const { wrapper } = await createWrapperWithAccounts(3);

      const accounts = await wrapper.getAccounts();

      accounts.forEach((account, index) => {
        expect((account as QrHdAccount).options.entropy.groupIndex).toBe(index);
      });
    });

    it('throws error in HD mode when address is not in indexes map', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      // Mock serialize to return an inconsistent state
      jest.spyOn(inner, 'serialize').mockResolvedValue({
        ...HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS,
        indexes: {}, // Empty indexes - inconsistent with accounts
      });

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /not found in device indexes/u,
      );
    });

    it('throws error when getPathFromAddress returns undefined', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(1);

      jest.spyOn(inner, 'getPathFromAddress').mockReturnValue(undefined);

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /derivation path not found in keyring/u,
      );
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.map((a) => a.address)).toStrictEqual(
        EXPECTED_ACCOUNTS.slice(0, 3),
      );
    });

    it('clears the cache and rebuilds it', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const accountsBefore = await wrapper.getAccounts();
      expect(accountsBefore).toHaveLength(2);

      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      const accountsAfter = await wrapper.getAccounts();
      expect(accountsAfter).toHaveLength(3);
      // The accounts should be new objects (cache was cleared)
      expect(accountsAfter[0]).not.toBe(accountsBefore[0]);
    });

    it('updates capabilities to HD mode after deserializing HD device state', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        bip44: {
          deriveIndex: true,
          derivePath: false,
          discover: false,
        },
      });
    });

    it('updates capabilities to Account mode after deserializing Account device state', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({
        legacyKeyring: inner,
        entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
      });

      // Initially, capabilities are HD mode defaults (derivePath is false for QR)

      await wrapper.deserialize(ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      // After deserializing Account mode state, capabilities should update
      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        custom: {
          createAccounts: true,
        },
      });
    });

    it('clears custom capability when transitioning from Account mode to HD mode', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({
        legacyKeyring: inner,
        entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
      });

      // First deserialize Account mode to get custom capability
      await wrapper.deserialize(ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS);
      expect(wrapper.capabilities.custom).toStrictEqual({
        createAccounts: true,
      });

      // Now deserialize HD mode state - custom capability should be cleared
      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      expect(wrapper.capabilities.custom).toBeUndefined();
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
          entropySource,
          accountType: EthAccountType.Eoa,
          encoding: 'hexadecimal',
          privateKey: '0xabc',
        } as unknown as QrKeyringCreateAccountOptions),
      ).rejects.toThrow(
        /Unsupported account creation type for HD mode QrKeyring/u,
      );
    });

    it('throws error for entropy source mismatch', async () => {
      const { wrapper } = await createWrapperWithAccounts(0);

      await expect(
        wrapper.createAccounts(deriveIndexOptions(0, 'wrong-entropy')),
      ).rejects.toThrow(/Entropy source mismatch/u);
    });

    it('throws error when no device is paired', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      await expect(
        wrapper.createAccounts(deriveIndexOptions(0, 'some-entropy')),
      ).rejects.toThrow('No device paired. Cannot create accounts.');
    });

    it('allows deriving accounts at any index (non-sequential)', async () => {
      const { wrapper } = createEmptyWrapper();

      const newAccounts = await wrapper.createAccounts(deriveIndexOptions(5));
      const account = getFirstHdAccount(newAccounts);

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

    it('throws error for negative groupIndex', async () => {
      const { wrapper } = createEmptyWrapper();

      await expect(
        wrapper.createAccounts(deriveIndexOptions(-1)),
      ).rejects.toThrow(/Invalid groupIndex: -1/u);
    });

    it('throws error for unsupported derive-path type', async () => {
      const { wrapper } = createEmptyWrapper();

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-path',
          entropySource,
          derivationPath: `m/44'/60'/0'/0/0`,
        } as unknown as QrKeyringCreateAccountOptions),
      ).rejects.toThrow(
        /Unsupported account creation type for HD mode QrKeyring: bip44:derive-path/u,
      );
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

  describe('Account Mode (CryptoAccount)', () => {
    describe('getAccounts', () => {
      it('returns accounts with PrivateKey entropy type (pre-defined addresses)', async () => {
        const { wrapper } = await createAccountModeWrapper();

        const accounts = await wrapper.getAccounts();
        const account = getFirstAccount(accounts);

        expect(account.address).toBe(
          ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts[0],
        );
        expect(account.options.entropy).toStrictEqual({
          type: KeyringAccountEntropyTypeOption.Custom,
        });
      });

      it('throws error in Account mode when address is not in paths map', async () => {
        const { wrapper, inner } = await createAccountModeWrapper();

        // Mock serialize to return an inconsistent state
        jest.spyOn(inner, 'serialize').mockResolvedValue({
          ...ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS,
          paths: {}, // Empty paths - inconsistent with accounts
        });

        await expect(wrapper.getAccounts()).rejects.toThrow(
          /not found in device paths/u,
        );
      });
    });

    describe('createAccounts', () => {
      it('throws error when trying to derive by index', async () => {
        const { wrapper } = await createAccountModeWrapper();

        await expect(
          wrapper.createAccounts({
            type: 'bip44:derive-index',
            entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
            groupIndex: 0,
          }),
        ).rejects.toThrow(
          /Account mode devices only support 'custom' account creation type/u,
        );
      });

      it('throws error when trying to derive by path', async () => {
        const { wrapper } = await createAccountModeWrapper();

        await expect(
          wrapper.createAccounts({
            type: 'bip44:derive-path',
            entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
            derivationPath: `m/44'/60'/0'/0/0`,
          } as unknown as QrKeyringCreateAccountOptions),
        ).rejects.toThrow(
          /Account mode devices only support 'custom' account creation type/u,
        );
      });

      it('creates account using custom type with valid addressIndex', async () => {
        const inner = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_CRYPTO_ACCOUNT_UR,
        });
        // Do not add any accounts initially
        const wrapper = new QrKeyringV2({
          legacyKeyring: inner,
          entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
        });

        const newAccounts = await wrapper.createAccounts(
          customAccountOptions(0),
        );
        const account = getFirstAccount(newAccounts);

        expect(account.address).toBe(
          ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.accounts[0],
        );
        expect(account.options.entropy).toStrictEqual({
          type: KeyringAccountEntropyTypeOption.Custom,
        });
      });

      it('returns existing account if addressIndex already exists', async () => {
        const { wrapper } = await createAccountModeWrapper();

        const existingAccounts = await wrapper.getAccounts();
        const existingAccount = getFirstAccount(existingAccounts);

        const newAccounts = await wrapper.createAccounts(
          customAccountOptions(0),
        );
        const returnedAccount = getFirstAccount(newAccounts);

        expect(returnedAccount).toBe(existingAccount);
      });

      it('throws error for invalid addressIndex type', async () => {
        const { wrapper } = await createAccountModeWrapper();

        await expect(
          wrapper.createAccounts({
            type: 'custom',
            entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
            addressIndex: 'invalid',
          } as unknown as { type: 'custom'; entropySource: string; addressIndex: number }),
        ).rejects.toThrow(/Invalid addressIndex/u);
      });

      it('throws error for negative addressIndex', async () => {
        const { wrapper } = await createAccountModeWrapper();

        await expect(
          wrapper.createAccounts(customAccountOptions(-1)),
        ).rejects.toThrow(/Invalid addressIndex/u);
      });

      it('throws error for addressIndex out of bounds', async () => {
        const { wrapper } = await createAccountModeWrapper();

        await expect(
          wrapper.createAccounts(customAccountOptions(999)),
        ).rejects.toThrow(/Address index 999 is out of bounds/u);
      });

      it('throws error when inner keyring fails to create account', async () => {
        const inner = new QrKeyring({
          bridge: getMockBridge(),
          ur: KNOWN_CRYPTO_ACCOUNT_UR,
        });
        const wrapper = new QrKeyringV2({
          legacyKeyring: inner,
          entropySource: ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp,
        });

        jest.spyOn(inner, 'addAccounts').mockResolvedValueOnce([]);

        await expect(
          wrapper.createAccounts(customAccountOptions(0)),
        ).rejects.toThrow('Failed to create new account');
      });
    });

    describe('deleteAccount', () => {
      it('removes an account from the keyring', async () => {
        const { wrapper, inner } = await createAccountModeWrapper();

        const accounts = await wrapper.getAccounts();
        const account = getFirstAccount(accounts);

        await wrapper.deleteAccount(account.id);

        const remainingAddresses = await inner.getAccounts();
        expect(remainingAddresses).toHaveLength(0);
      });
    });
  });
});
