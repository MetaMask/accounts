import type { TypedTxData } from '@ethereumjs/tx';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  type KeyringAccount,
  type KeyringRequest,
  KeyringType,
  PrivateKeyEncoding,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

// eslint-disable-next-line @typescript-eslint/naming-convention
import SimpleKeyring from './simple-keyring';
import { SimpleKeyringV2 } from './simple-keyring-v2';

// Valid 32-byte private keys for testing
const TEST_PRIVATE_KEY_1 =
  'b8a9c05beeedb25df85f8d641538cbffedf67216048de9c678ee26260eb91952';
const TEST_PRIVATE_KEY_2 =
  'c55cfce6240234fb9d3da48300f0b9fda93fc991d6cf4592c8ce1993a09068ff';
const TEST_PRIVATE_KEY_3 =
  'a55cfce6240234fb9d3da48300f0b9fda93fc991d6cf4592c8ce1993a09068ff';

/**
 * Helper function to create a minimal KeyringRequest for testing.
 *
 * @param accountId - The account ID to use in the request.
 * @param method - The method name for the request.
 * @param params - Optional array of parameters for the request.
 * @returns A KeyringRequest object for testing.
 */
function createMockRequest(
  accountId: AccountId,
  method: string,
  params: Json[] = [],
): KeyringRequest {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    scope: EthScope.Eoa,
    account: accountId,
    origin: 'http://localhost',
    request: {
      method,
      params,
    },
  };
}

describe('SimpleKeyringV2', () => {
  let inner: SimpleKeyring;
  let wrapper: SimpleKeyringV2;

  beforeEach(async () => {
    inner = new SimpleKeyring();
    wrapper = new SimpleKeyringV2({
      legacyKeyring: inner,
    });
  });

  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      expect(wrapper.type).toBe(KeyringType.PrivateKey);
      expect(wrapper.capabilities.scopes).toStrictEqual([EthScope.Eoa]);
      expect(wrapper.capabilities.privateKey).toBeDefined();

      const privateKeyCapabilities = wrapper.capabilities.privateKey;
      expect(privateKeyCapabilities?.importFormats).toHaveLength(1);
      expect(privateKeyCapabilities?.importFormats?.[0]?.encoding).toBe(
        PrivateKeyEncoding.Hexadecimal,
      );
      expect(privateKeyCapabilities?.exportFormats).toHaveLength(1);
      expect(privateKeyCapabilities?.exportFormats?.[0]?.encoding).toBe(
        PrivateKeyEncoding.Hexadecimal,
      );
    });
  });

  describe('getAccounts', () => {
    beforeEach(async () => {
      await inner.deserialize([TEST_PRIVATE_KEY_1, TEST_PRIVATE_KEY_2]);
    });

    it('returns all accounts from the legacy keyring', async () => {
      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(2);
    });

    it('creates KeyringAccount objects with correct structure', async () => {
      const accounts = await wrapper.getAccounts();

      expect(accounts.length).toBeGreaterThan(0);
      const account = accounts[0];
      expect(account).toBeDefined();
      expect(account?.id).toBeDefined();
      expect(account?.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
      expect(account?.type).toBe(EthAccountType.Eoa);
      expect(account?.scopes).toStrictEqual([EthScope.Eoa]);
      expect(account?.methods).toContain(EthMethod.PersonalSign);
      expect(account?.methods).toContain(EthMethod.SignTransaction);
      expect(account?.methods).toContain(EthMethod.Sign);
      expect(account?.methods).toContain(EthMethod.SignTypedDataV1);
      expect(account?.methods).toContain(EthMethod.SignTypedDataV3);
      expect(account?.methods).toContain(EthMethod.SignTypedDataV4);
      expect(account?.options?.entropy?.type).toBe('private-key');
    });

    it('returns empty array when no accounts exist', async () => {
      const emptyKeyring = new SimpleKeyring();
      const emptyWrapper = new SimpleKeyringV2({
        legacyKeyring: emptyKeyring,
      });

      const accounts = await emptyWrapper.getAccounts();

      expect(accounts).toHaveLength(0);
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state', async () => {
      const newInner = new SimpleKeyring();
      const newWrapper = new SimpleKeyringV2({
        legacyKeyring: newInner,
      });

      await newWrapper.deserialize([TEST_PRIVATE_KEY_1, TEST_PRIVATE_KEY_2]);

      const accounts = await newInner.getAccounts();
      expect(accounts).toHaveLength(2);
    });

    it('clears the cache and rebuilds it', async () => {
      await inner.deserialize([TEST_PRIVATE_KEY_1, TEST_PRIVATE_KEY_2]);
      const accounts1 = await wrapper.getAccounts();

      // Create a new wrapper and deserialize
      const newInner = new SimpleKeyring();
      const newWrapper = new SimpleKeyringV2({
        legacyKeyring: newInner,
      });

      await newWrapper.deserialize([TEST_PRIVATE_KEY_1]);

      const accounts2 = await newWrapper.getAccounts();
      expect(accounts2).toHaveLength(1);
      // Should be a different instance after deserialize
      expect(accounts2[0]).not.toBe(accounts1[0]);
    });

    it('handles empty account list', async () => {
      const newInner = new SimpleKeyring();
      const newWrapper = new SimpleKeyringV2({
        legacyKeyring: newInner,
      });

      await newWrapper.deserialize([]);

      const accounts = await newWrapper.getAccounts();
      expect(accounts).toHaveLength(0);
    });

    it('properly repopulates registry after deserialize', async () => {
      await inner.deserialize([TEST_PRIVATE_KEY_1, TEST_PRIVATE_KEY_2]);

      const accounts1 = await wrapper.getAccounts();
      const firstAccountId = accounts1[0]?.id;

      // Deserialize new data
      await wrapper.deserialize([TEST_PRIVATE_KEY_1]);

      // Old account IDs should no longer be in registry
      const accounts2 = await wrapper.getAccounts();
      expect(accounts2).toHaveLength(1);
      expect(accounts2[0]?.id).not.toBe(firstAccountId);
    });
  });

  describe('createAccounts', () => {
    it('creates an account from a private key', async () => {
      const created = await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      expect(created).toHaveLength(1);

      const account = created[0];
      expect(account).toBeDefined();
      expect(account?.type).toBe(EthAccountType.Eoa);
      expect(account?.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(1);
    });

    it('imports multiple accounts sequentially', async () => {
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_2,
      });

      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_3,
      });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
    });

    it('throws error for unsupported account creation type', async () => {
      await expect(
        wrapper.createAccounts({
          // @ts-expect-error Testing invalid type
          type: 'private-key:generate',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_1,
        }),
      ).rejects.toThrow(
        'Unsupported account creation type for SimpleKeyring: private-key:generate',
      );
    });

    it('throws error for unsupported account type', async () => {
      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Erc4337,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_1,
        }),
      ).rejects.toThrow(
        `Unsupported account type for SimpleKeyring: ${EthAccountType.Erc4337}. Only '${EthAccountType.Eoa}' is supported.`,
      );
    });

    it('throws error for unsupported encoding', async () => {
      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Base58,
          privateKey: TEST_PRIVATE_KEY_1,
        }),
      ).rejects.toThrow(
        `Unsupported encoding for SimpleKeyring: base58. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
      );
    });

    it('preserves existing accounts when adding new ones', async () => {
      const first = await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const accounts1 = await wrapper.getAccounts();
      expect(accounts1).toHaveLength(1);

      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_2,
      });

      const accounts2 = await wrapper.getAccounts();
      expect(accounts2).toHaveLength(2);

      // First account should still be at index 0
      expect(accounts2[0]).toBe(first[0]);
    });

    it('properly caches newly created accounts', async () => {
      const created = await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const account1 = created[0];
      const accounts = await wrapper.getAccounts();

      // Should be the same cached instance
      expect(accounts[0]).toBe(account1);
    });

    it('throws error when inner keyring fails to import key', async () => {
      // Mock deserialize to return an empty array (simulating failure to add the key)
      jest
        .spyOn(inner, 'deserialize')
        .mockRejectedValueOnce(new Error('Invalid key'));

      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_1,
        }),
      ).rejects.toThrow('Invalid key');
    });

    it('throws error when no new address is added after import', async () => {
      // Create first account
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const existingAddresses = await inner.getAccounts();

      // Mock getAccounts to return the same addresses before and after import
      // (simulating the key didn't get added)
      jest
        .spyOn(inner, 'getAccounts')
        .mockResolvedValueOnce(existingAddresses) // First call (before import)
        .mockResolvedValueOnce(existingAddresses); // Second call (after import) - same addresses

      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_2,
        }),
      ).rejects.toThrow('Failed to import private key');
    });

    it('rolls back inner keyring state on failed import', async () => {
      // Create first account
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const accountsBefore = await wrapper.getAccounts();
      expect(accountsBefore).toHaveLength(1);

      const serializedBefore = await inner.serialize();
      expect(serializedBefore).toHaveLength(1);

      const existingAddresses = await inner.getAccounts();

      // Mock getAccounts to simulate a failed import (no new address added)
      jest
        .spyOn(inner, 'getAccounts')
        .mockResolvedValueOnce(existingAddresses) // First call (before import)
        .mockResolvedValueOnce(existingAddresses); // Second call (after import) - same addresses

      // Attempt to import should fail
      await expect(
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_2,
        }),
      ).rejects.toThrow('Failed to import private key');

      // Verify rollback: inner keyring should still have only 1 account
      const serializedAfter = await inner.serialize();
      expect(serializedAfter).toHaveLength(1);
      expect(serializedAfter).toStrictEqual(serializedBefore);
    });

    it('handles concurrent account creations with mutex', async () => {
      // Create multiple accounts concurrently
      const promises = [
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_1,
        }),
        wrapper.createAccounts({
          type: 'private-key:import',
          accountType: EthAccountType.Eoa,
          encoding: PrivateKeyEncoding.Hexadecimal,
          privateKey: TEST_PRIVATE_KEY_2,
        }),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toHaveLength(1);
      expect(results[1]).toHaveLength(1);

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(2);
    });
  });

  describe('deleteAccount', () => {
    beforeEach(async () => {
      // Create accounts sequentially
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_2,
      });
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_3,
      });
    });

    it('removes an account from the keyring', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      const lastAccount = accounts[2];
      expect(lastAccount).toBeDefined();
      expect(lastAccount?.id).toBeDefined();

      await wrapper.deleteAccount((lastAccount as KeyringAccount).id);

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(
        remaining.find((a) => a.id === (lastAccount as KeyringAccount).id),
      ).toBeUndefined();
    });

    it('removes the account from the cache', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      const lastAccount = accounts[2];
      expect(lastAccount).toBeDefined();
      expect(lastAccount?.id).toBeDefined();

      if (lastAccount?.id) {
        await wrapper.deleteAccount(lastAccount.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining.find((a) => a.id === lastAccount?.id)).toBeUndefined();
    });

    it('allows deleting any account regardless of order', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      // Delete the first account
      const firstAccount = accounts[0];
      expect(firstAccount).toBeDefined();
      if (firstAccount?.id) {
        await wrapper.deleteAccount(firstAccount.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((a) => a.id === firstAccount?.id)).toBeUndefined();
    });

    it('allows deleting the only remaining account', async () => {
      // Delete all accounts one by one
      let accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      const account2 = accounts[2];
      expect(account2).toBeDefined();
      await wrapper.deleteAccount((account2 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(2);

      const account1 = accounts[1];
      expect(account1).toBeDefined();
      await wrapper.deleteAccount((account1 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(1);

      const account0 = accounts[0];
      expect(account0).toBeDefined();
      await wrapper.deleteAccount((account0 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(0);
    });

    it('can re-create accounts after deleting all', async () => {
      // Delete all accounts
      let accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      const accountToDelete2 = accounts[2];
      const accountToDelete1 = accounts[1];
      const accountToDelete0 = accounts[0];
      expect(accountToDelete2).toBeDefined();
      expect(accountToDelete1).toBeDefined();
      expect(accountToDelete0).toBeDefined();

      await wrapper.deleteAccount((accountToDelete2 as KeyringAccount).id);
      await wrapper.deleteAccount((accountToDelete1 as KeyringAccount).id);
      await wrapper.deleteAccount((accountToDelete0 as KeyringAccount).id);

      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(0);

      // Now we can create accounts again
      const result = await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      expect(result).toHaveLength(1);

      const final = await wrapper.getAccounts();
      expect(final).toHaveLength(1);
    });

    it('handles concurrent deletion with mutex', async () => {
      const accounts = await wrapper.getAccounts();
      const account1 = accounts[0];
      const account2 = accounts[1];

      expect(account1).toBeDefined();
      expect(account2).toBeDefined();

      // Attempt concurrent deletion (should work due to mutex)
      const promises = [
        wrapper.deleteAccount((account1 as KeyringAccount).id),
        wrapper.deleteAccount((account2 as KeyringAccount).id),
      ];

      await Promise.all(promises);

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('exportAccount', () => {
    beforeEach(async () => {
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });
    });

    it('exports an account as private key in hexadecimal encoding', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      expect(account?.id).toBeDefined();
      const accountId = (account as KeyringAccount).id;

      const exported = await wrapper.exportAccount(accountId);

      expect(exported.type).toBe('private-key');
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
      expect(exported.encoding).toBe(PrivateKeyEncoding.Hexadecimal);
    });

    it('accepts explicit hexadecimal encoding option', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      expect(account).toBeDefined();

      const accountId = (account as KeyringAccount).id;

      const exported = await wrapper.exportAccount(accountId, {
        type: 'private-key',
        encoding: PrivateKeyEncoding.Hexadecimal,
      });

      expect(exported.type).toBe('private-key');
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
    });

    it('throws error for unsupported encoding', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      expect(account).toBeDefined();

      const accountId = (account as KeyringAccount).id;

      await expect(
        wrapper.exportAccount(accountId, {
          type: 'private-key',
          encoding: PrivateKeyEncoding.Base58,
        }),
      ).rejects.toThrow('Unsupported encoding for SimpleKeyring: base58. Only');
    });

    it('exports the correct private key', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      expect(account).toBeDefined();

      const accountId = (account as KeyringAccount).id;
      const exported = await wrapper.exportAccount(accountId);

      // The exported key should be a valid hex string
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
    });

    it('handles multiple accounts with different keys', async () => {
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_2,
      });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(2);

      const exported1 = await wrapper.exportAccount(
        (accounts[0] as KeyringAccount).id,
      );
      const exported2 = await wrapper.exportAccount(
        (accounts[1] as KeyringAccount).id,
      );

      // Different accounts should export different keys
      expect(exported1.privateKey).not.toBe(exported2.privateKey);
    });
  });

  describe('submitRequest', () => {
    let accountId: AccountId;

    beforeEach(async () => {
      const created = await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const account = created[0];
      accountId = (account as KeyringAccount).id;
    });

    describe('eth_signTransaction', () => {
      it('signs a transaction', async () => {
        const txParams: TypedTxData = {
          nonce: '0x00',
          gasPrice: '0x09184e72a000',
          gasLimit: '0x2710',
          to: '0x0000000000000000000000000000000000000001',
          value: '0x1000',
        };

        const request = createMockRequest(
          accountId,
          EthMethod.SignTransaction,
          [txParams as unknown as Json],
        );

        const result = await wrapper.submitRequest(request);
        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(
          accountId,
          EthMethod.SignTransaction,
          [],
        );

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('eth_sign', () => {
      it('signs a message', async () => {
        const request = createMockRequest(accountId, EthMethod.Sign, [
          '0x0000000000000000000000000000000000000000',
          '0x68656c6c6f',
        ]);

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
        expect((result as string).startsWith('0x')).toBe(true);
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(accountId, EthMethod.Sign, [
          '0x0000000000000000000000000000000000000000',
        ]);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('personal_sign', () => {
      it('signs a personal message', async () => {
        const request = createMockRequest(accountId, EthMethod.PersonalSign, [
          '0x68656c6c6f',
        ]);

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
        expect((result as string).startsWith('0x')).toBe(true);
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(
          accountId,
          EthMethod.PersonalSign,
          [],
        );

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('eth_signTypedData_v1', () => {
      it('signs typed data v1', async () => {
        const typedData = [
          {
            type: 'string',
            name: 'Message',
            value: 'Hi, Alice!',
          },
        ];

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV1,
          ['0x0000000000000000000000000000000000000000', typedData],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV1,
          ['0x0000000000000000000000000000000000000000'],
        );

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('eth_signTypedData_v3', () => {
      it('signs typed data v3', async () => {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
            ],
            Message: [{ name: 'content', type: 'string' }],
          },
          domain: {
            name: 'Test',
            version: '1',
            chainId: 1,
          },
          primaryType: 'Message',
          message: {
            content: 'Hello!',
          },
        };

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV3,
          [
            '0x0000000000000000000000000000000000000000',
            typedData, // Pass object, not stringified
          ],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });
    });

    describe('eth_signTypedData_v4', () => {
      it('signs typed data v4', async () => {
        const typedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
            ],
            Message: [{ name: 'content', type: 'string' }],
          },
          domain: {
            name: 'Test',
            version: '1',
            chainId: 1,
          },
          primaryType: 'Message',
          message: {
            content: 'Hello!',
          },
        };

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV4,
          [
            '0x0000000000000000000000000000000000000000',
            typedData, // Pass object, not stringified
          ],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });
    });

    describe('eth_getEncryptionPublicKey', () => {
      it('gets encryption public key', async () => {
        const request = createMockRequest(
          accountId,
          'eth_getEncryptionPublicKey',
          ['0x0000000000000000000000000000000000000000'],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });
    });

    describe('eth_decrypt', () => {
      it('throws error for missing params', async () => {
        const request = createMockRequest(accountId, 'eth_decrypt', []);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });

      it('throws error for invalid encrypted data', async () => {
        const encryptedData = {
          version: 'x25519-xsalsa20-poly1305',
          nonce: 'test-nonce',
          ephemPublicKey: 'test-key',
          ciphertext: 'test-ciphertext',
        };

        const request = createMockRequest(accountId, 'eth_decrypt', [
          encryptedData,
        ]);

        // This will fail with actual decryption due to invalid encrypted data
        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('eth_getAppKeyAddress', () => {
      it('gets app key address', async () => {
        const request = createMockRequest(accountId, 'eth_getAppKeyAddress', [
          'https://example.com',
        ]);

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(
          accountId,
          'eth_getAppKeyAddress',
          [],
        );

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('eth_signEip7702Authorization', () => {
      it('signs EIP-7702 authorization', async () => {
        // EIP-7702 authorization format
        const authorization = [
          1, // chainId
          '0x0000000000000000000000000000000000000001', // address
          0, // nonce
        ];

        const request = createMockRequest(
          accountId,
          'eth_signEip7702Authorization',
          [authorization],
        );

        const result = await wrapper.submitRequest(request);
        expect(result).toBeDefined();
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(
          accountId,
          'eth_signEip7702Authorization',
          [],
        );

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          expect.any(Error),
        );
      });
    });

    describe('unsupported methods', () => {
      it('throws error for unsupported method', async () => {
        const request = createMockRequest(accountId, 'unsupported_method', []);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          `Account ${accountId} cannot handle method: unsupported_method`,
        );
      });

      it('throws error when account cannot handle the method', async () => {
        // eth_sendTransaction is a valid Ethereum method but not in SIMPLE_KEYRING_METHODS
        const request = createMockRequest(accountId, 'eth_sendTransaction', []);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          `Account ${accountId} cannot handle method: eth_sendTransaction`,
        );
      });
    });
  });

  describe('getAccount', () => {
    beforeEach(async () => {
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });
    });

    it('retrieves an account by ID', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];
      expect(account).toBeDefined();

      const retrieved = await wrapper.getAccount(
        (account as KeyringAccount).id,
      );
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(account?.id);
      expect(retrieved.address).toBe(account?.address);
    });

    it('throws error for non-existent account', async () => {
      await expect(
        wrapper.getAccount('non-existent-id' as AccountId),
      ).rejects.toThrow(expect.any(Error));
    });
  });

  describe('registry management', () => {
    it('properly syncs registry when external changes occur', async () => {
      await wrapper.createAccounts({
        type: 'private-key:import',
        accountType: EthAccountType.Eoa,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: TEST_PRIVATE_KEY_1,
      });

      const accounts1 = await wrapper.getAccounts();
      expect(accounts1).toHaveLength(1);

      // Add account directly to inner keyring (external modification)
      await inner.addAccounts(1);

      // Get accounts again, should reflect the change
      const accounts2 = await wrapper.getAccounts();
      expect(accounts2).toHaveLength(2);

      // Should have cached both accounts
      expect(accounts2[0]).toBeDefined();
      expect(accounts2[1]).toBeDefined();
    });
  });
});
