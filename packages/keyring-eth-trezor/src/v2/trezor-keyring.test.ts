import type { Bip44Account } from '@metamask/account-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';
import type { KeyringAccount } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import HDKey from 'hdkey';

import type { TrezorBridge } from '../trezor-bridge';
import { TrezorKeyring as LegacyTrezorKeyring } from '../trezor-keyring';
import {
  BIP44_HD_PATH_PREFIX,
  LEGACY_MEW_PATH_PREFIX,
  SLIP0044_TESTNET_PATH_PREFIX,
  TrezorKeyring,
} from './trezor-keyring';

/**
 * Type alias for Trezor keyring accounts (always BIP-44 derived).
 */
type TrezorAccount = Bip44Account<KeyringAccount>;

/**
 * Test addresses derived from the fake HD key.
 */
const EXPECTED_ACCOUNTS = [
  '0x1c96099350f13D558464eC79B9bE4445AA0eF579',
  '0x1b00AeD43a693F3a957F9FeB5cC08AFA031E37a0',
  '0x8C9bA4F86ae12250eE1c3676ee925c77426D0B68',
  '0xfFe45DbC6C1bEe8f211dA2ec961F73B82e9ab42c',
  '0xb8a13c465c9a0a46f262a1ad666a752923e65b8c',
  '0xBB9603A1660F796182BA28819Dee475AFC356Dcf',
] as const;

// Test mnemonic: "finish oppose decorate face calm tragic certain desk hour urge dinosaur mango".
const fakeXPubKeys = {
  [BIP44_HD_PATH_PREFIX]:
    'xpub6FCjt1vawWNJRoqG4EPJmG2vA3VNry6MfSTbXKDLqT2RkK9R1h13EW6k5ajXNCtCY9ygsmcB2kKPKpKkSkouzRvFyQLA3yn1N86c7Cau7G1',
  [LEGACY_MEW_PATH_PREFIX]:
    'xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt',
  [SLIP0044_TESTNET_PATH_PREFIX]:
    'xpub6ED6Su5fxghtTbgPrWgSXaxz9qubTjopMwYToxPNMtrtgGgoKbefjRMxZjMx1VNfMtxjGQpf1VwqNv7UiB71rMCkbea5aNoWFSXKhsZxwpv',
};

const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKeys[BIP44_HD_PATH_PREFIX]);
const fakeMewHdKey = HDKey.fromExtendedKey(
  fakeXPubKeys[LEGACY_MEW_PATH_PREFIX],
);

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
  const [account] = accounts;
  if (!account) {
    throw new Error('Expected at least one account');
  }
  return account;
}

/**
 * Get an account at a specific index, throwing if not present.
 *
 * @param accounts - The accounts array.
 * @param index - The index to retrieve.
 * @returns The account at the index.
 */
function getAccountAt(accounts: TrezorAccount[], index: number): TrezorAccount {
  const account = accounts[index];
  if (!account) {
    throw new Error(`Expected account at index ${index}`);
  }
  return account;
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
 * @param hdPath - Optional HD path to set (defaults to BIP44 standard).
 * @returns The inner keyring.
 */
function createInnerKeyring(hdPath?: string): LegacyTrezorKeyring {
  const inner = new LegacyTrezorKeyring({ bridge: getMockBridge() });
  // Set the HD path before setting HDKey (setHdPath resets HDKey)
  if (hdPath) {
    inner.setHdPath(hdPath as Parameters<typeof inner.setHdPath>[0]);
  }
  // Set up the HDKey so accounts can be derived without unlocking
  inner.hdk = fakeHdKey;
  return inner;
}

/**
 * Create a TrezorKeyring wrapper with accounts.
 *
 * @param accountCount - Number of accounts to add.
 * @returns The wrapper and inner keyring.
 */
async function createWrapperWithAccounts(accountCount = 3): Promise<{
  wrapper: TrezorKeyring;
  inner: LegacyTrezorKeyring;
}> {
  const inner = createInnerKeyring();
  inner.setAccountToUnlock(0);
  await inner.addAccounts(accountCount);

  const wrapper = new TrezorKeyring({ legacyKeyring: inner, entropySource });
  return { wrapper, inner };
}

/**
 * Create a TrezorKeyring wrapper without any accounts.
 *
 * @returns The wrapper and inner keyring.
 */
function createEmptyWrapper(): {
  wrapper: TrezorKeyring;
  inner: LegacyTrezorKeyring;
} {
  const inner = createInnerKeyring();
  const wrapper = new TrezorKeyring({ legacyKeyring: inner, entropySource });
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
 * Helper to create account options for bip44:derive-path.
 *
 * @param derivationPath - The full derivation path.
 * @param source - Optional entropy source override.
 * @returns The create account options.
 */
function derivePathOptions(
  derivationPath: `m/${string}`,
  source: string = entropySource,
): {
  type: 'bip44:derive-path';
  entropySource: string;
  derivationPath: `m/${string}`;
} {
  return {
    type: 'bip44:derive-path',
    entropySource: source,
    derivationPath,
  };
}

describe('TrezorKeyring', () => {
  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      const { wrapper } = createEmptyWrapper();

      expect(wrapper.type).toBe(KeyringType.Trezor);
      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        bip44: {
          deriveIndex: true,
          derivePath: true,
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

      // Manually populate the paths map with a non-zero index
      // to prove that paths is actually being used (not just derivation)
      inner.paths[EXPECTED_ACCOUNTS[0]] = 5;

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account.options.entropy.groupIndex).toBe(5);
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
      const inner = new LegacyTrezorKeyring({ bridge: getMockBridge() });
      const wrapper = new TrezorKeyring({
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
      const wrapper = new TrezorKeyring({
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
      accounts.forEach((account, index) => {
        expect(account.address).toBe(EXPECTED_ACCOUNTS[index]);
      });
    });

    it('properly repopulates registry after deserialize with deterministic IDs', async () => {
      const { wrapper } = await createWrapperWithAccounts(2);
      const accounts1 = await wrapper.getAccounts();
      const firstAccountId = accounts1[0]?.id;

      // Re-deserialize with only the first account
      await wrapper.deserialize({
        hdPath: `m/44'/60'/0'/0`,
        accounts: [EXPECTED_ACCOUNTS[0]],
        page: 0,
        perPage: 5,
      });

      const accounts2 = await wrapper.getAccounts();
      expect(accounts2).toHaveLength(1);
      // Same address -> same deterministic ID
      expect(accounts2[0]?.id).toBe(firstAccountId);
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

    it('throws error for negative groupIndex', async () => {
      const { wrapper } = createEmptyWrapper();

      await expect(
        wrapper.createAccounts(deriveIndexOptions(-1)),
      ).rejects.toThrow(
        'Invalid groupIndex: -1. Must be a non-negative integer.',
      );
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

  describe('createAccounts with bip44:derive-path', () => {
    it('creates an account with a BIP44 derivation path', async () => {
      const { wrapper, inner } = createEmptyWrapper();

      const newAccounts = await wrapper.createAccounts(
        derivePathOptions(`${BIP44_HD_PATH_PREFIX}/5`),
      );
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[5]);
      expect(account.options.entropy.groupIndex).toBe(5);
      expect(account.options.entropy.derivationPath).toBe(
        `${BIP44_HD_PATH_PREFIX}/5`,
      );
      expect(inner.hdPath).toBe(BIP44_HD_PATH_PREFIX);
    });

    it('creates an account with legacy MEW path', async () => {
      // Create wrapper with legacy MEW path pre-set to avoid HDKey reset
      const inner = createInnerKeyring(LEGACY_MEW_PATH_PREFIX);
      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      const newAccounts = await wrapper.createAccounts(
        derivePathOptions(`${LEGACY_MEW_PATH_PREFIX}/3`),
      );
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[3]);
      expect(account.options.entropy.groupIndex).toBe(3);
      expect(account.options.entropy.derivationPath).toBe(
        `${LEGACY_MEW_PATH_PREFIX}/3`,
      );
      expect(inner.hdPath).toBe(LEGACY_MEW_PATH_PREFIX);
    });

    it('creates an account with SLIP0044 testnet path', async () => {
      // Create wrapper with testnet path pre-set to avoid HDKey reset
      const inner = createInnerKeyring(SLIP0044_TESTNET_PATH_PREFIX);
      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      const newAccounts = await wrapper.createAccounts(
        derivePathOptions(`${SLIP0044_TESTNET_PATH_PREFIX}/2`),
      );
      const account = getFirstAccount(newAccounts);

      expect(account.address).toBe(EXPECTED_ACCOUNTS[2]);
      expect(account.options.entropy.groupIndex).toBe(2);
      expect(account.options.entropy.derivationPath).toBe(
        `${SLIP0044_TESTNET_PATH_PREFIX}/2`,
      );
      expect(inner.hdPath).toBe(SLIP0044_TESTNET_PATH_PREFIX);
    });

    it('returns existing account if path already exists', async () => {
      const { wrapper } = createEmptyWrapper();

      // Create first account
      const firstResult = await wrapper.createAccounts(
        derivePathOptions(`m/44'/60'/0'/0/0`),
      );
      const firstAccount = getFirstAccount(firstResult);

      // Try to create same path again
      const secondResult = await wrapper.createAccounts(
        derivePathOptions(`m/44'/60'/0'/0/0`),
      );
      const secondAccount = getFirstAccount(secondResult);

      expect(secondAccount).toBe(firstAccount);
    });

    it('throws error for invalid derivation path format', async () => {
      const { wrapper } = createEmptyWrapper();

      await expect(
        wrapper.createAccounts(
          // @ts-expect-error - intentionally testing invalid path
          derivePathOptions('invalid-path'),
        ),
      ).rejects.toThrow(/Invalid derivation path/u);
    });

    it('throws error for unsupported HD path prefix', async () => {
      const { wrapper } = createEmptyWrapper();

      // Valid format but unsupported base path (coin type 100 instead of 60 or 1)
      await expect(
        wrapper.createAccounts(derivePathOptions(`m/44'/100'/0'/0/0`)),
      ).rejects.toThrow(/Invalid derivation path/u);
    });

    it('throws error for valid format but disallowed HD path', async () => {
      const { wrapper } = createEmptyWrapper();

      // Path matches the regex (starts with m/44'/60') but the base path
      // m/44'/60'/1'/0 is not in ALLOWED_HD_PATHS
      await expect(
        wrapper.createAccounts(derivePathOptions(`m/44'/60'/1'/0/0`)),
      ).rejects.toThrow(/Invalid derivation path/u);
    });

    it('throws error for entropy source mismatch with derive-path', async () => {
      const { wrapper } = createEmptyWrapper();

      await expect(
        wrapper.createAccounts(
          derivePathOptions(`m/44'/60'/0'/0/0`, 'wrong-entropy'),
        ),
      ).rejects.toThrow(/Entropy source mismatch/u);
    });

    it('normalizes derivation path with leading zeros in index', async () => {
      const { wrapper } = createEmptyWrapper();

      // Create account with leading zeros in the index
      const firstResult = await wrapper.createAccounts(
        derivePathOptions(`m/44'/60'/0'/0/007`),
      );
      const firstAccount = getFirstAccount(firstResult);

      // The stored derivation path should be normalized (no leading zeros)
      expect(firstAccount.options.entropy.derivationPath).toBe(
        `m/44'/60'/0'/0/7`,
      );
      expect(firstAccount.options.entropy.groupIndex).toBe(7);

      // Requesting the same path with leading zeros should return the cached account
      const secondResult = await wrapper.createAccounts(
        derivePathOptions(`m/44'/60'/0'/0/007`),
      );
      const secondAccount = getFirstAccount(secondResult);

      expect(secondAccount).toBe(firstAccount);

      // Requesting with the normalized path should also return the same account
      const thirdResult = await wrapper.createAccounts(
        derivePathOptions(`m/44'/60'/0'/0/7`),
      );
      const thirdAccount = getFirstAccount(thirdResult);

      expect(thirdAccount).toBe(firstAccount);
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
      inner.setHdPath(LEGACY_MEW_PATH_PREFIX);
      inner.hdk = fakeMewHdKey; // Reset after setHdPath clears it
      inner.setAccountToUnlock(0);
      await inner.addAccounts(1);

      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      const accounts = await wrapper.getAccounts();
      const account = getFirstAccount(accounts);

      expect(account.options.entropy.derivationPath).toBe(
        `${LEGACY_MEW_PATH_PREFIX}/0`,
      );
    });

    it('clears registry when switching HD paths via createAccounts', async () => {
      // Create wrapper with account on BIP44 standard path
      const inner = createInnerKeyring(); // Uses m/44'/60'/0'/0 by default
      inner.setAccountToUnlock(0);
      await inner.addAccounts(1);

      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      // Get initial accounts - this populates the registry
      const initialAccounts = await wrapper.getAccounts();
      expect(initialAccounts).toHaveLength(1);
      const initialAccountId = getFirstAccount(initialAccounts).id;

      // Spy on registry.clear to verify it's called when path changes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clearSpy = jest.spyOn((wrapper as any).registry, 'clear');

      // inner.hdPath is m/44'/60'/0'/0
      // Call createAccounts with legacy MEW path (m/44'/60'/0') - this should trigger path change
      // We need to reset the HDKey after setHdPath clears it inside createAccounts
      const originalSetHdPath = inner.setHdPath.bind(inner);
      jest.spyOn(inner, 'setHdPath').mockImplementation((path) => {
        originalSetHdPath(path);
        inner.hdk = fakeMewHdKey;
      });

      await wrapper.createAccounts(
        derivePathOptions(`${LEGACY_MEW_PATH_PREFIX}/0`),
      );

      // Verify registry.clear was called
      expect(clearSpy).toHaveBeenCalled();

      // The old account should no longer be accessible because registry was cleared
      await expect(wrapper.getAccount(initialAccountId)).rejects.toThrow(
        /Account not found/u,
      );
    });

    it('does not clear registry when using same HD path', async () => {
      // Create wrapper with account on BIP44 standard path
      const inner = createInnerKeyring();
      inner.setAccountToUnlock(0);
      await inner.addAccounts(1);

      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      // Get initial accounts - this populates the registry
      const initialAccounts = await wrapper.getAccounts();
      expect(initialAccounts).toHaveLength(1);
      const initialAccountId = getFirstAccount(initialAccounts).id;

      // Spy on registry.clear
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clearSpy = jest.spyOn((wrapper as any).registry, 'clear');

      // Call createAccounts with same HD path base (m/44'/60'/0'/0) but different index
      await wrapper.createAccounts(derivePathOptions(`m/44'/60'/0'/0/1`));

      // Verify registry.clear was NOT called
      expect(clearSpy).not.toHaveBeenCalled();

      // The original account should still be accessible
      const account = await wrapper.getAccount(initialAccountId);
      expect(account).toBeDefined();
    });
  });

  describe('locked device handling', () => {
    it('returns cached accounts when device is locked', async () => {
      const { wrapper, inner } = await createWrapperWithAccounts(2);

      // First call with device unlocked populates the cache
      const unlockedAccounts = await wrapper.getAccounts();
      expect(unlockedAccounts).toHaveLength(2);

      // Simulate locked device by clearing the HDKey
      inner.hdk = {} as typeof fakeHdKey;

      // Should return cached accounts
      const lockedAccounts = await wrapper.getAccounts();
      expect(lockedAccounts).toHaveLength(2);
      expect(lockedAccounts).toStrictEqual(unlockedAccounts);
    });

    it('throws error when device is locked and accounts not cached', async () => {
      const inner = createInnerKeyring();
      inner.setAccountToUnlock(0);
      await inner.addAccounts(1);

      const wrapper = new TrezorKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      // Simulate locked device before accounts are cached
      inner.hdk = {} as typeof fakeHdKey;

      await expect(wrapper.getAccounts()).rejects.toThrow(
        /Trezor device is locked/u,
      );
    });
  });
});
