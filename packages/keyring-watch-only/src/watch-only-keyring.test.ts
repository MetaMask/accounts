import {
  AccountCreationType,
  BtcScope,
  EthAccountType,
  EthScope,
} from '@metamask/keyring-api';
import type {
  CreateAccountOptions,
  KeyringAccount,
  KeyringRequest,
} from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import type { Keyring } from '@metamask/keyring-api/v2';
import { getChecksumAddress } from '@metamask/utils';
import type { Json } from '@metamask/utils';

import { isWatchOnlyKeyring, WatchOnlyKeyring } from './watch-only-keyring';

const TEST_ADDRESS_1 = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045';
const TEST_ADDRESS_1_CHECKSUMMED = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
const TEST_ADDRESS_2 = '0xab5801a7d398351b8be11c439e05c5b3259aec9b';

function createAddressImportOptions(
  address: string,
  accountType?: string,
  scopes?: string[],
): CreateAccountOptions {
  return {
    type: AccountCreationType.AddressImport,
    address,
    ...(accountType ? { accountType } : {}),
    ...(scopes ? { scopes } : {}),
  } as CreateAccountOptions;
}

function createMockRequest(accountId: string): KeyringRequest {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    scope: EthScope.Eoa,
    account: accountId,
    origin: 'http://localhost',
    request: {
      method: 'personal_sign',
      params: [],
    },
  };
}

describe('WatchOnlyKeyring', () => {
  let keyring: WatchOnlyKeyring;

  beforeEach(() => {
    keyring = new WatchOnlyKeyring();
  });

  describe('constructor', () => {
    it('exposes the watch-only keyring type', () => {
      expect(keyring.type).toBe(KeyringType.WatchOnly);
      expect(WatchOnlyKeyring.type).toBe(KeyringType.WatchOnly);
    });

    it('exposes watch-only capabilities', () => {
      expect(keyring.capabilities.scopes).toStrictEqual([EthScope.Eoa]);
      expect(keyring.capabilities.address).toStrictEqual({ import: true });
      expect(keyring.capabilities.privateKey).toBeUndefined();
      expect(keyring.capabilities.bip44).toBeUndefined();
    });

    it('does not implement exportAccount', () => {
      expect((keyring as Keyring).exportAccount).toBeUndefined();
    });
  });

  describe('isWatchOnlyKeyring', () => {
    it('returns true for a WatchOnlyKeyring', () => {
      expect(isWatchOnlyKeyring(keyring)).toBe(true);
    });

    it('returns false for another keyring', () => {
      const otherKeyring: Keyring = {
        type: 'hd',
        capabilities: { scopes: [EthScope.Eoa] },
        serialize: async () => Promise.resolve({}) as Promise<Json>,
        deserialize: async () => Promise.resolve(),
        getAccounts: async () => Promise.resolve([]),
        getAccount: () => {
          throw new Error('Not implemented');
        },
        createAccounts: async () => Promise.resolve([]),
        deleteAccount: async () => Promise.resolve(),
        submitRequest: () => {
          throw new Error('Not implemented');
        },
      };

      expect(isWatchOnlyKeyring(otherKeyring)).toBe(false);
    });
  });

  describe('getAccounts', () => {
    it('returns an empty array when no accounts exist', async () => {
      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('returns all imported accounts', async () => {
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1));
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_2));

      const accounts = await keyring.getAccounts();

      expect(accounts).toHaveLength(2);
      expect(accounts.map((account) => account.address)).toStrictEqual([
        TEST_ADDRESS_1_CHECKSUMMED,
        getChecksumAddress(TEST_ADDRESS_2),
      ]);
    });
  });

  describe('createAccounts', () => {
    it('creates an account from an address', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(accounts).toHaveLength(1);

      const account = accounts[0] as KeyringAccount;
      expect(account.id).toBeDefined();
      expect(account.address).toBe(TEST_ADDRESS_1_CHECKSUMMED);
      expect(account.type).toBe(EthAccountType.Eoa);
      expect(account.scopes).toStrictEqual([EthScope.Eoa]);
      expect(account.methods).toStrictEqual([]);
      expect(account.options).toStrictEqual({});
    });

    it('normalizes the address to its checksummed representation', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      const account = accounts[0] as KeyringAccount;
      expect(account.address).toBe(getChecksumAddress(TEST_ADDRESS_1));
    });

    it('defaults the account type to eoa', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      const account = accounts[0] as KeyringAccount;
      expect(account.type).toBe(EthAccountType.Eoa);
    });

    it('creates an erc4337 account when requested', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1, EthAccountType.Erc4337),
      );

      const account = accounts[0] as KeyringAccount;
      expect(account.type).toBe(EthAccountType.Erc4337);
    });

    it('uses the provided scopes when supplied', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1, undefined, [EthScope.Eoa]),
      );

      const account = accounts[0] as KeyringAccount;
      expect(account.scopes).toStrictEqual([EthScope.Eoa]);
    });

    it('accepts specific EVM scopes when the keyring supports any EVM scope', async () => {
      const accounts = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1, undefined, [
          EthScope.Mainnet,
          EthScope.Testnet,
        ]),
      );

      const account = accounts[0] as KeyringAccount;
      expect(account.scopes).toStrictEqual([
        EthScope.Mainnet,
        EthScope.Testnet,
      ]);
    });

    it('returns the existing account when re-importing with different scopes', async () => {
      const [firstAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );
      const [secondAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1, undefined, [
          EthScope.Mainnet,
        ]),
      );

      expect(secondAccount).toStrictEqual(firstAccount);
    });

    it('generates deterministic account IDs', async () => {
      const [account] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      const otherKeyring = new WatchOnlyKeyring();
      const [otherAccount] = await otherKeyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1_CHECKSUMMED),
      );

      expect(account?.id).toBe(otherAccount?.id);
    });

    it('is idempotent for an already-imported address', async () => {
      const [firstAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );
      const [secondAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(secondAccount).toStrictEqual(firstAccount);

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
    });

    it('is idempotent across address casings', async () => {
      const [firstAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );
      const [secondAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1_CHECKSUMMED),
      );

      expect(secondAccount).toStrictEqual(firstAccount);

      const accounts = await keyring.getAccounts();
      expect(accounts).toHaveLength(1);
    });

    it('handles concurrent account creations', async () => {
      await Promise.all([
        keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1)),
        keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_2)),
      ]);

      expect(await keyring.getAccounts()).toHaveLength(2);
    });

    it('throws for an unsupported account creation type', async () => {
      await expect(
        keyring.createAccounts({
          type: AccountCreationType.Bip44DeriveIndex,
          entropySource: 'some-entropy-source',
          groupIndex: 0,
        }),
      ).rejects.toThrow(
        'Unsupported create account option type: bip44:derive-index',
      );
    });

    it('throws for an invalid address', async () => {
      await expect(
        keyring.createAccounts(createAddressImportOptions('not-an-address')),
      ).rejects.toThrow('Invalid EVM address: not-an-address');
    });

    it('throws for an address that is too short', async () => {
      await expect(
        keyring.createAccounts(createAddressImportOptions('0x1234')),
      ).rejects.toThrow('Invalid EVM address: 0x1234');
    });

    it('throws for an address with an invalid checksum', async () => {
      const invalidChecksumAddress =
        '0xD8Da6BF26964aF9D7eEd9e03E53415D37aA96045';

      await expect(
        keyring.createAccounts(
          createAddressImportOptions(invalidChecksumAddress),
        ),
      ).rejects.toThrow(`Invalid EVM address: ${invalidChecksumAddress}`);
    });

    it('throws for a non-EVM account type', async () => {
      await expect(
        keyring.createAccounts(
          createAddressImportOptions(TEST_ADDRESS_1, 'bip122:p2pkh'),
        ),
      ).rejects.toThrow(
        "Unsupported account type for WatchOnlyKeyring: bip122:p2pkh. Only 'eip155:eoa' and 'eip155:erc4337' are supported.",
      );
    });

    it('throws for unsupported scopes', async () => {
      await expect(
        keyring.createAccounts(
          createAddressImportOptions(TEST_ADDRESS_1, undefined, [
            BtcScope.Mainnet,
          ]),
        ),
      ).rejects.toThrow(
        `Unsupported scopes for WatchOnlyKeyring: ${BtcScope.Mainnet}. Supported scopes: ${EthScope.Eoa}.`,
      );
    });

    it('throws for empty scopes', async () => {
      await expect(
        keyring.createAccounts(
          createAddressImportOptions(TEST_ADDRESS_1, undefined, []),
        ),
      ).rejects.toThrow('Scopes must not be empty');
    });
  });

  describe('getAccount', () => {
    it('returns the account matching the given ID', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      const account = await keyring.getAccount(createdAccount?.id as string);

      expect(account).toStrictEqual(createdAccount);
    });

    it('throws when no account matches the given ID', async () => {
      await expect(
        keyring.getAccount('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(
        'Account not found for id: 00000000-0000-0000-0000-000000000000',
      );
    });
  });

  describe('lookupAccount', () => {
    it('returns the account matching the given ID', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(keyring.lookupAccount(createdAccount?.id as string)).toStrictEqual(
        createdAccount,
      );
    });

    it('returns undefined when no account matches the given ID', async () => {
      expect(
        keyring.lookupAccount('00000000-0000-0000-0000-000000000000'),
      ).toBeUndefined();
    });
  });

  describe('lookupByAddress', () => {
    it('returns the account matching the given address', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(keyring.lookupByAddress(TEST_ADDRESS_1_CHECKSUMMED)).toStrictEqual(
        createdAccount,
      );
    });

    it('matches the address case-insensitively', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(keyring.lookupByAddress(TEST_ADDRESS_1)).toStrictEqual(
        createdAccount,
      );
    });

    it('returns undefined when no account matches the given address', async () => {
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1));

      expect(keyring.lookupByAddress(TEST_ADDRESS_2)).toBeUndefined();
    });

    it('returns undefined when the keyring holds no accounts', () => {
      expect(keyring.lookupByAddress(TEST_ADDRESS_1)).toBeUndefined();
    });
  });

  describe('deleteAccount', () => {
    it('deletes the account matching the given ID', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      await keyring.deleteAccount(createdAccount?.id as string);

      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('re-creating a deleted account preserves the account ID', async () => {
      const [createdAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      await keyring.deleteAccount(createdAccount?.id as string);
      const [recreatedAccount] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      expect(recreatedAccount?.id).toBe(createdAccount?.id);
    });

    it('throws when no account matches the given ID', async () => {
      await expect(
        keyring.deleteAccount('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(
        'Account not found for id: 00000000-0000-0000-0000-000000000000',
      );
    });
  });

  describe('serialize', () => {
    it('serializes an empty keyring', async () => {
      expect(await keyring.serialize()).toStrictEqual({ accounts: [] });
    });

    it('serializes the imported accounts', async () => {
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1));
      await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_2, EthAccountType.Erc4337),
      );

      expect(await keyring.serialize()).toStrictEqual({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1_CHECKSUMMED,
            scopes: [EthScope.Eoa],
          },
          {
            type: EthAccountType.Erc4337,
            address: getChecksumAddress(TEST_ADDRESS_2),
            scopes: [EthScope.Eoa],
          },
        ],
      });
    });
  });

  describe('deserialize', () => {
    it('restores accounts from a serialized state', async () => {
      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1_CHECKSUMMED,
            scopes: [EthScope.Eoa],
          },
        ],
      });

      const accounts = await keyring.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(TEST_ADDRESS_1_CHECKSUMMED);
      expect(accounts[0]?.type).toBe(EthAccountType.Eoa);
      expect(accounts[0]?.scopes).toStrictEqual([EthScope.Eoa]);
    });

    it('normalizes addresses from a serialized state', async () => {
      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1,
            scopes: [EthScope.Eoa],
          },
        ],
      });

      const accounts = await keyring.getAccounts();

      expect(accounts[0]?.address).toBe(TEST_ADDRESS_1_CHECKSUMMED);
    });

    it('restores non-default account types', async () => {
      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Erc4337,
            address: TEST_ADDRESS_1_CHECKSUMMED,
            scopes: [EthScope.Eoa],
          },
        ],
      });

      const accounts = await keyring.getAccounts();

      expect(accounts[0]?.type).toBe(EthAccountType.Erc4337);
    });

    it('restores specific EVM scopes from a serialized state', async () => {
      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1_CHECKSUMMED,
            scopes: [EthScope.Mainnet],
          },
        ],
      });

      const accounts = await keyring.getAccounts();

      expect(accounts[0]?.scopes).toStrictEqual([EthScope.Mainnet]);
    });

    it('round-trips through serialize', async () => {
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1));
      await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_2, EthAccountType.Erc4337),
      );

      const state = await keyring.serialize();

      const otherKeyring = new WatchOnlyKeyring();
      await otherKeyring.deserialize(state);

      expect(await otherKeyring.getAccounts()).toStrictEqual(
        await keyring.getAccounts(),
      );
    });

    it('replaces any existing state', async () => {
      await keyring.createAccounts(createAddressImportOptions(TEST_ADDRESS_1));

      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_2,
            scopes: [EthScope.Eoa],
          },
        ],
      });

      const accounts = await keyring.getAccounts();

      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(getChecksumAddress(TEST_ADDRESS_2));
    });

    it('handles an empty account list', async () => {
      await keyring.deserialize({ accounts: [] });

      expect(await keyring.getAccounts()).toStrictEqual([]);
    });

    it('de-duplicates repeated addresses', async () => {
      await keyring.deserialize({
        accounts: [
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1,
            scopes: [EthScope.Eoa],
          },
          {
            type: EthAccountType.Eoa,
            address: TEST_ADDRESS_1_CHECKSUMMED,
            scopes: [EthScope.Eoa],
          },
        ],
      });

      expect(await keyring.getAccounts()).toHaveLength(1);
    });

    it('throws for an invalid state', async () => {
      await expect(keyring.deserialize({})).rejects.toThrow(
        'At path: accounts -- Expected an array value, but received: undefined',
      );
      await expect(keyring.deserialize('invalid')).rejects.toThrow(
        'Expected an object, but received: "invalid"',
      );
    });

    it('throws for a state entry missing the account type', async () => {
      await expect(
        keyring.deserialize({ accounts: [{ address: TEST_ADDRESS_1 }] }),
      ).rejects.toThrow(/At path: accounts\.0\.type/u);
    });

    it('throws for a state entry missing scopes', async () => {
      await expect(
        keyring.deserialize({
          accounts: [
            { type: EthAccountType.Eoa, address: TEST_ADDRESS_1_CHECKSUMMED },
          ],
        }),
      ).rejects.toThrow(/At path: accounts\.0\.scopes/u);
    });

    it('throws for an invalid address in the state', async () => {
      await expect(
        keyring.deserialize({
          accounts: [
            {
              type: EthAccountType.Eoa,
              address: 'not-an-address',
              scopes: [EthScope.Eoa],
            },
          ],
        }),
      ).rejects.toThrow('Invalid EVM address: not-an-address');
    });

    it('throws for a non-EVM account type in the state', async () => {
      await expect(
        keyring.deserialize({
          accounts: [
            {
              type: 'bip122:p2pkh',
              address: TEST_ADDRESS_1_CHECKSUMMED,
              scopes: [EthScope.Eoa],
            },
          ],
        }),
      ).rejects.toThrow(
        "Unsupported account type for WatchOnlyKeyring: bip122:p2pkh. Only 'eip155:eoa' and 'eip155:erc4337' are supported.",
      );
    });

    it('throws for unsupported scopes in the state', async () => {
      await expect(
        keyring.deserialize({
          accounts: [
            {
              type: EthAccountType.Eoa,
              address: TEST_ADDRESS_1_CHECKSUMMED,
              scopes: [BtcScope.Mainnet],
            },
          ],
        }),
      ).rejects.toThrow(
        `Unsupported scopes for WatchOnlyKeyring: ${BtcScope.Mainnet}. Supported scopes: ${EthScope.Eoa}.`,
      );
    });
  });

  describe('submitRequest', () => {
    it('always throws', async () => {
      const [account] = await keyring.createAccounts(
        createAddressImportOptions(TEST_ADDRESS_1),
      );

      await expect(
        keyring.submitRequest(createMockRequest(account?.id as string)),
      ).rejects.toThrow(
        'WatchOnlyKeyring cannot handle requests: watch-only accounts have no signing capability',
      );
    });
  });
});
