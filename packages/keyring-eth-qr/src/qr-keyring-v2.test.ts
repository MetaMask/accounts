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
import { QrKeyringV2 } from './qr-keyring-v2';
import {
  ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  EXPECTED_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS,
  HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS,
  KNOWN_CRYPTO_ACCOUNT_UR,
  KNOWN_HDKEY_UR,
} from '../test/fixtures';

const entropySource = HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS.xfp;

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
 * Create a QrKeyringV2 wrapper with a paired HD mode device and accounts.
 *
 * @param accountCount - Number of accounts to add.
 * @returns The wrapper and inner keyring.
 */
async function createWrapperWithAccounts(accountCount = 3): Promise<{
  wrapper: QrKeyringV2;
  inner: QrKeyring;
}> {
  const inner = new QrKeyring({
    bridge: getMockBridge(),
    ur: KNOWN_HDKEY_UR,
  });
  await inner.addAccounts(accountCount);

  const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

describe('QrKeyringV2', () => {
  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      expect(wrapper.type).toBe(KeyringType.Qr);
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
      expect(accounts.map((a) => a.address)).toStrictEqual([
        EXPECTED_ACCOUNTS[0],
        EXPECTED_ACCOUNTS[1],
        EXPECTED_ACCOUNTS[2],
      ]);
    });

    it('creates KeyringAccount objects with correct structure', async () => {
      const { wrapper } = await createWrapperWithAccounts(1);

      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(1);
      const account = accounts[0] as Bip44Account<KeyringAccount>;
      expect(account).toMatchObject({
        type: EthAccountType.Eoa,
        address: EXPECTED_ACCOUNTS[0],
        scopes: [EthScope.Eoa],
        methods: [
          EthMethod.SignTransaction,
          EthMethod.PersonalSign,
          EthMethod.SignTypedDataV4,
        ],
        options: {
          entropy: {
            type: KeyringAccountEntropyTypeOption.Mnemonic,
            id: HDKEY_SERIALIZED_KEYRING_WITH_NO_ACCOUNTS.xfp,
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

      expect(
        (accounts[0] as Bip44Account<KeyringAccount>).options.entropy
          ?.groupIndex,
      ).toBe(0);
      expect(
        (accounts[1] as Bip44Account<KeyringAccount>).options.entropy
          ?.groupIndex,
      ).toBe(1);
      expect(
        (accounts[2] as Bip44Account<KeyringAccount>).options.entropy
          ?.groupIndex,
      ).toBe(2);
    });

    it('throws error in HD mode when address is not in indexes map', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      await inner.addAccounts(1);
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      // Mock serialize to return an inconsistent state
      // where the keyring mode is HD but the indexes map is empty
      jest.spyOn(inner, 'serialize').mockResolvedValue({
        ...HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS,
        indexes: {}, // Empty indexes - inconsistent with accounts
      });

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /not found in device indexes/u,
      );
    });

    it('uses empty string for derivationPath when getPathFromAddress returns undefined', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      await inner.addAccounts(1);
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      // Mock getPathFromAddress to return undefined
      jest.spyOn(inner, 'getPathFromAddress').mockReturnValue(undefined);

      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(
        (accounts[0] as Bip44Account<KeyringAccount>).options.entropy
          .derivationPath,
      ).toBe('');
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      expect(accounts.map((a) => a.address)).toStrictEqual([
        EXPECTED_ACCOUNTS[0],
        EXPECTED_ACCOUNTS[1],
        EXPECTED_ACCOUNTS[2],
      ]);
    });

    it('clears the cache and rebuilds it', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(2);

      const accountsBefore = await wrapper.getAccounts();
      expect(accountsBefore).toHaveLength(2);

      // Deserialize with more accounts
      await wrapper.deserialize(HDKEY_SERIALIZED_KEYRING_WITH_ACCOUNTS);

      const accountsAfter = await wrapper.getAccounts();
      expect(accountsAfter).toHaveLength(3);

      // The accounts should be new objects (cache was cleared)
      expect(accountsAfter[0]).not.toBe(accountsBefore[0]);
    });
  });

  describe('createAccounts', () => {
    it('creates the first account at index 0', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      const newAccounts = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 0,
      });

      expect(newAccounts).toHaveLength(1);
      expect(newAccounts[0]?.address).toBe(EXPECTED_ACCOUNTS[0]);
    });

    it('creates an account at a specific index', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const newAccounts = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 2,
      });

      expect(newAccounts).toHaveLength(1);
      expect(newAccounts[0]?.address).toBe(EXPECTED_ACCOUNTS[2]);
    });

    it('returns existing account if groupIndex already exists', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const existingAccounts = await wrapper.getAccounts();
      const newAccounts = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 0,
      });

      expect(newAccounts).toHaveLength(1);
      expect(newAccounts[0]).toBe(existingAccounts[0]);
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
        'Unsupported account creation type for QrKeyring: private-key:import',
      );
    });

    it('throws error for entropy source mismatch', async () => {
      const { wrapper } = await createWrapperWithAccounts(0);

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: 'wrong-entropy',
          groupIndex: 0,
        }),
      ).rejects.toThrow(/Entropy source mismatch/u);
    });

    it('throws error when no device is paired', async () => {
      const inner = new QrKeyring({ bridge: getMockBridge() });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: 'some-entropy',
          groupIndex: 0,
        }),
      ).rejects.toThrow('No device paired. Cannot create accounts.');
    });

    it('allows deriving accounts at any index (non-sequential)', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      // Skip index 0 and go directly to index 5
      const accounts = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 5,
      });

      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(EXPECTED_ACCOUNTS[5]);
      expect(
        (accounts[0] as Bip44Account<KeyringAccount>).options.entropy
          .groupIndex,
      ).toBe(5);
    });

    it('creates multiple accounts sequentially', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      const account1 = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 0,
      });
      const account2 = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 1,
      });
      const account3 = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource,
        groupIndex: 2,
      });

      expect(account1[0]?.address).toBe(EXPECTED_ACCOUNTS[0]);
      expect(account2[0]?.address).toBe(EXPECTED_ACCOUNTS[1]);
      expect(account3[0]?.address).toBe(EXPECTED_ACCOUNTS[2]);
    });

    it('throws error when inner keyring fails to create account', async () => {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_HDKEY_UR,
      });
      const wrapper = new QrKeyringV2({ legacyKeyring: inner, entropySource });

      // Mock addAccounts to return empty array
      jest.spyOn(inner, 'addAccounts').mockResolvedValueOnce([]);

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource,
          groupIndex: 0,
        }),
      ).rejects.toThrow('Failed to create new account');
    });
  });

  describe('deleteAccount', () => {
    it('removes an account from the keyring', async () => {
      const { wrapper } = await createWrapperWithAccounts(3);

      const accountsBefore = await wrapper.getAccounts();
      expect(accountsBefore).toHaveLength(3);

      const accountToDelete = accountsBefore[1];
      await wrapper.deleteAccount(accountToDelete!.id);

      const accountsAfter = await wrapper.getAccounts();
      expect(accountsAfter).toHaveLength(2);
      expect(accountsAfter.map((a) => a.address)).not.toContain(
        accountToDelete!.address,
      );
    });

    it('removes the account from the cache', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);

      const accounts = await wrapper.getAccounts();
      const accountToDelete = accounts[0];

      await wrapper.deleteAccount(accountToDelete!.id);

      // The account should not be found by ID
      await expect(wrapper.getAccount(accountToDelete!.id)).rejects.toThrow(
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
      const account = await wrapper.getAccount(accounts[0]!.id);

      expect(account).toBe(accounts[0]);
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
    const accountModeAddress = '0x2043858DA83bCD92Ae342C1bAaD4D5F5B5C328B3';
    const accountModeEntropySource =
      ACCOUNT_SERIALIZED_KEYRING_WITH_ACCOUNTS.xfp;

    /**
     * Create a QrKeyringV2 wrapper with a paired Account mode device.
     *
     * @param addAccount - Whether to add the pre-defined account.
     * @returns The wrapper and inner keyring.
     */
    async function createAccountModeWrapper(addAccount = true): Promise<{
      wrapper: QrKeyringV2;
      inner: QrKeyring;
    }> {
      const inner = new QrKeyring({
        bridge: getMockBridge(),
        ur: KNOWN_CRYPTO_ACCOUNT_UR,
      });
      if (addAccount) {
        await inner.addAccounts(1);
      }

      const wrapper = new QrKeyringV2({
        legacyKeyring: inner,
        entropySource: accountModeEntropySource,
      });
      return { wrapper, inner };
    }

    describe('getAccounts', () => {
      it('returns accounts with Mnemonic entropy type (BIP-44 derived)', async () => {
        const { wrapper } = await createAccountModeWrapper();

        const accounts = await wrapper.getAccounts();

        expect(accounts).toHaveLength(1);
        expect(accounts[0]?.address).toBe(accountModeAddress);

        const account = accounts[0] as Bip44Account<KeyringAccount>;
        expect(account.options.entropy.type).toBe(
          KeyringAccountEntropyTypeOption.Mnemonic,
        );
        expect(account.options.entropy.id).toBe(accountModeEntropySource);
        expect(account.options.entropy.groupIndex).toBe(0);
        expect(account.options.entropy.derivationPath).toBeDefined();
      });
    });

    describe('deleteAccount', () => {
      it('removes an account from the keyring', async () => {
        const { wrapper, inner } = await createAccountModeWrapper();

        const accounts = await wrapper.getAccounts();
        expect(accounts).toHaveLength(1);

        await wrapper.deleteAccount(accounts[0]!.id);

        const remainingAddresses = await inner.getAccounts();
        expect(remainingAddresses).toHaveLength(0);
      });
    });
  });
});
