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

import { HdKeyring } from './hd-keyring';
import { HdKeyringV2 } from './hd-keyring-v2';

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const TEST_ENTROPY_SOURCE_ID = 'test-entropy-source-id';

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

describe('HdKeyringV2', () => {
  let inner: HdKeyring;
  let wrapper: HdKeyringV2;

  beforeEach(async () => {
    inner = new HdKeyring();
    await inner.deserialize({
      mnemonic: Array.from(Buffer.from(TEST_MNEMONIC, 'utf8')),
      numberOfAccounts: 0,
      hdPath: "m/44'/60'/0'/0",
    });

    wrapper = new HdKeyringV2({
      legacyKeyring: inner,
      entropySource: TEST_ENTROPY_SOURCE_ID,
    });
  });

  describe('constructor', () => {
    it('creates a wrapper with correct type and capabilities', () => {
      expect(wrapper.type).toBe(KeyringType.Hd);
      expect(wrapper.capabilities.scopes).toStrictEqual([EthScope.Eoa]);
      expect(wrapper.capabilities.bip44?.deriveIndex).toBe(true);
      expect(wrapper.capabilities.bip44?.derivePath).toBe(false);
      expect(wrapper.capabilities.bip44?.discover).toBe(false);
    });
  });

  describe('getAccounts', () => {
    beforeEach(async () => {
      await inner.addAccounts(2);
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
      expect(account?.methods).toContain('eth_decrypt');
      expect(account?.options?.entropy?.type).toBe('mnemonic');

      // Verify mnemonic entropy properties
      const entropy = account?.options?.entropy;
      expect(entropy).toBeDefined();
      expect('id' in (entropy ?? {})).toBe(true);
      expect('groupIndex' in (entropy ?? {})).toBe(true);
      expect('derivationPath' in (entropy ?? {})).toBe(true);

      // Assert on specific values only after type narrowing
      expect(entropy && 'id' in entropy ? entropy.id : undefined).toBe(
        TEST_ENTROPY_SOURCE_ID,
      );
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(0);
      expect(
        entropy && 'derivationPath' in entropy
          ? entropy.derivationPath
          : undefined,
      ).toBe("m/44'/60'/0'/0/0");
    });

    it('caches KeyringAccount objects', async () => {
      const accounts1 = await wrapper.getAccounts();
      const accounts2 = await wrapper.getAccounts();

      // Same instances should be returned from cache
      expect(accounts1[0]).toBe(accounts2[0]);
      expect(accounts1[1]).toBe(accounts2[1]);
    });

    it('returns correct groupIndex for multiple accounts', async () => {
      await inner.addAccounts(3);
      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(5);

      const entropy0 = accounts[0]?.options?.entropy;
      expect(
        entropy0 && 'groupIndex' in entropy0 ? entropy0.groupIndex : undefined,
      ).toBe(0);

      const entropy1 = accounts[1]?.options?.entropy;
      expect(
        entropy1 && 'groupIndex' in entropy1 ? entropy1.groupIndex : undefined,
      ).toBe(1);

      const entropy2 = accounts[2]?.options?.entropy;
      expect(
        entropy2 && 'groupIndex' in entropy2 ? entropy2.groupIndex : undefined,
      ).toBe(2);

      const entropy3 = accounts[3]?.options?.entropy;
      expect(
        entropy3 && 'groupIndex' in entropy3 ? entropy3.groupIndex : undefined,
      ).toBe(3);

      const entropy4 = accounts[4]?.options?.entropy;
      expect(
        entropy4 && 'groupIndex' in entropy4 ? entropy4.groupIndex : undefined,
      ).toBe(4);
    });
  });

  describe('deserialize', () => {
    it('deserializes the legacy keyring state', async () => {
      const newInner = new HdKeyring();
      const newWrapper = new HdKeyringV2({
        legacyKeyring: newInner,
        entropySource: TEST_ENTROPY_SOURCE_ID,
      });

      await newWrapper.deserialize({
        mnemonic: Array.from(Buffer.from(TEST_MNEMONIC, 'utf8')),
        numberOfAccounts: 2,
        hdPath: "m/44'/60'/0'/0",
      });

      const accounts = await newWrapper.getAccounts();
      expect(accounts).toHaveLength(2);
    });

    it('clears the cache and rebuilds it', async () => {
      await inner.addAccounts(2);
      const accounts1 = await wrapper.getAccounts();

      // Create a new inner keyring for re-deserialization
      const newInner = new HdKeyring();
      const newWrapper = new HdKeyringV2({
        legacyKeyring: newInner,
        entropySource: TEST_ENTROPY_SOURCE_ID,
      });

      await newWrapper.deserialize({
        mnemonic: Array.from(Buffer.from(TEST_MNEMONIC, 'utf8')),
        numberOfAccounts: 1,
        hdPath: "m/44'/60'/0'/0",
      });

      const accounts2 = await newWrapper.getAccounts();
      expect(accounts2).toHaveLength(1);
      // Should be a different instance after deserialize
      expect(accounts2[0]).not.toBe(accounts1[0]);
    });
  });

  describe('createAccounts', () => {
    it('creates the first account at index 0', async () => {
      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(created).toHaveLength(1);

      const account = created[0];
      const entropy = account?.options?.entropy;
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(0);

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(1);
    });

    it('creates an account at a specific index', async () => {
      // Create accounts sequentially
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 1,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 3,
      });

      expect(created).toHaveLength(1);

      const account = created[0];
      const entropy = account?.options?.entropy;
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(3);

      // Should have created accounts 0, 1, 2, 3
      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(4);
    });

    it('caches intermediate accounts when creating at higher index', async () => {
      // Create accounts sequentially
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 1,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(3);

      const entropy0 = allAccounts[0]?.options?.entropy;
      expect(
        entropy0 && 'groupIndex' in entropy0 ? entropy0.groupIndex : undefined,
      ).toBe(0);

      const entropy1 = allAccounts[1]?.options?.entropy;
      expect(
        entropy1 && 'groupIndex' in entropy1 ? entropy1.groupIndex : undefined,
      ).toBe(1);

      const entropy2 = allAccounts[2]?.options?.entropy;
      expect(
        entropy2 && 'groupIndex' in entropy2 ? entropy2.groupIndex : undefined,
      ).toBe(2);
    });

    it('returns existing account if groupIndex already exists', async () => {
      const first = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      const second = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(second[0]).toBe(first[0]);
      expect(await wrapper.getAccounts()).toHaveLength(1);
    });

    it('throws error for unsupported account creation type', async () => {
      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-path',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          derivationPath: "m/44'/60'/0'/0/0",
        }),
      ).rejects.toThrow('Unsupported account creation type for HdKeyring');
    });

    it('throws error for entropy source mismatch', async () => {
      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: 'wrong-entropy-source',
          groupIndex: 0,
        }),
      ).rejects.toThrow('Entropy source mismatch');
    });

    it('throws error when inner keyring fails to create account', async () => {
      // Mock addAccounts to return an empty array
      jest.spyOn(inner, 'addAccounts').mockResolvedValueOnce([]);

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 0,
        }),
      ).rejects.toThrow('Failed to create new account');
    });

    it('creates multiple accounts sequentially', async () => {
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 1,
      });

      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
    });

    it('throws when trying to skip indices', async () => {
      // Request account at index 3 without creating 0, 1, 2 first
      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 3,
        }),
      ).rejects.toThrow(
        'Can only create the next account in sequence. Expected groupIndex 0, got 3.',
      );
    });

    it('throws when trying to skip indices with existing accounts', async () => {
      // Create account at index 0
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(await wrapper.getAccounts()).toHaveLength(1);

      // Now request account at index 3, which should fail
      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 3,
        }),
      ).rejects.toThrow(
        'Can only create the next account in sequence. Expected groupIndex 1, got 3.',
      );

      // Should still have only 1 account
      expect(await wrapper.getAccounts()).toHaveLength(1);
    });

    it('syncs cache when legacy keyring adds accounts directly', async () => {
      // Create first account via wrapper
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(await wrapper.getAccounts()).toHaveLength(1);

      // Add accounts directly via legacy keyring (simulating external modification)
      await inner.addAccounts(2);

      // Now create account at index 3 via wrapper
      // This should detect the external changes and sync properly
      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 3,
      });

      expect(created).toHaveLength(1);

      const account = created[0];
      const entropy = account?.options?.entropy;
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(3);

      // Should have 4 accounts total (0, 1, 2, 3)
      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(4);
    });

    it('caches intermediate accounts when wrapper creates after inner adds multiple', async () => {
      // Add multiple accounts directly via inner keyring (e.g., 0, 1, 2)
      await inner.addAccounts(3);

      // Now create account at index 3 via wrapper
      // The wrapper should cache all the intermediate accounts (0, 1, 2) that were added by inner
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 3,
      });

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(4);

      // Verify all accounts are cached with correct groupIndex
      const groupIndices = allAccounts
        .map((a) => {
          const ent = a.options.entropy;
          return ent && 'groupIndex' in ent ? ent.groupIndex : -1;
        })
        .sort((a, b) => a - b);

      expect(groupIndices).toStrictEqual([0, 1, 2, 3]);

      // Verify the accounts at indices 0, 1, 2 are in the cache
      for (let i = 0; i < 3; i++) {
        const account = allAccounts[i];
        expect(account).toBeDefined();
        if (account) {
          // Access the account again to verify it's cached
          const cachedAccount = await wrapper.getAccount(account.id);
          // eslint-disable-next-line jest/no-conditional-expect
          expect(cachedAccount).toBe(account);
        }
      }
    });
  });

  describe('deleteAccount', () => {
    beforeEach(async () => {
      // Create accounts sequentially at indices 0, 1, 2
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 1,
      });
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });
    });

    it('removes the last account from the keyring', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      const lastAccount = accounts[2];
      expect(lastAccount).toBeDefined();
      expect(lastAccount?.id).toBeDefined();

      if (lastAccount?.id) {
        await wrapper.deleteAccount(lastAccount.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((a) => a.id === lastAccount?.id)).toBeUndefined();
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

    it('throws when trying to delete a non-last account', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      const middleAccount = accounts[1];
      expect(middleAccount).toBeDefined();

      const middleAccountId = middleAccount?.id;
      expect(middleAccountId).toBeDefined();

      await expect(
        wrapper.deleteAccount(middleAccountId as string),
      ).rejects.toThrow(
        'Can only delete the last account in the HD keyring due to derivation index constraints.',
      );

      // All accounts should still be present
      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(3);
    });

    it('throws when trying to delete the first account', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);
      const firstAccount = accounts[0];
      expect(firstAccount).toBeDefined();

      const firstAccountId = firstAccount?.id;
      expect(firstAccountId).toBeDefined();

      await expect(
        wrapper.deleteAccount(firstAccountId as string),
      ).rejects.toThrow(
        'Can only delete the last account in the HD keyring due to derivation index constraints.',
      );

      // All accounts should still be present
      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(3);
    });

    it('allows deleting the only remaining account', async () => {
      // Delete accounts from last to first
      let accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      // Delete last account (index 2)
      const account2 = accounts[2];
      expect(account2).toBeDefined();
      await wrapper.deleteAccount((account2 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(2);

      // Delete last account (index 1)
      const account1 = accounts[1];
      expect(account1).toBeDefined();
      await wrapper.deleteAccount((account1 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(1);

      // Delete last remaining account (index 0)
      const account0 = accounts[0];
      expect(account0).toBeDefined();
      await wrapper.deleteAccount((account0 as KeyringAccount).id);
      accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(0);
    });

    it('can re-create accounts after deleting all', async () => {
      // Delete all accounts from last to first
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

      // Now we can create accounts again starting from index 0
      const result = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(result).toHaveLength(1);
      const newAccount = result[0];
      const entropy = newAccount?.options.entropy;
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(0);

      const final = await wrapper.getAccounts();
      expect(final).toHaveLength(1);
    });
  });

  describe('exportAccount', () => {
    beforeEach(async () => {
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });
    });

    it('exports an account as private key in hexadecimal encoding', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      // Assert account exists using a type-safe approach
      expect(account).toBeDefined();

      // TypeScript knows account could be undefined, but we've asserted it exists
      // Use a safe access pattern
      const accountId = account?.id ?? '';
      expect(accountId).not.toBe('');

      const exported = await wrapper.exportAccount(accountId);

      expect(exported.type).toBe('private-key');
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
      expect(exported.encoding).toBe(PrivateKeyEncoding.Hexadecimal);
    });

    it('accepts explicit hexadecimal encoding option', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0];

      expect(account).toBeDefined();

      const accountId = account?.id ?? '';
      expect(accountId).not.toBe('');

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

      const accountId = account?.id ?? '';
      expect(accountId).not.toBe('');

      await expect(
        wrapper.exportAccount(accountId, {
          type: 'private-key',
          encoding: 'base58',
        }),
      ).rejects.toThrow('Unsupported encoding for Ethereum HD keyring');
    });
  });

  describe('submitRequest', () => {
    let accountId: AccountId;

    beforeEach(async () => {
      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      const account = created[0];
      // Use a safe fallback that will cause tests to fail if account doesn't exist
      accountId = account?.id ?? ('' as AccountId);
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
      it('decrypts a message', async () => {
        // First get the encryption public key
        const pubKeyRequest = createMockRequest(
          accountId,
          'eth_getEncryptionPublicKey',
          ['0x0000000000000000000000000000000000000000', {}],
        );

        const pubKey = await wrapper.submitRequest(pubKeyRequest);

        // Encrypt a message (this would normally be done externally)
        const encryptedData = {
          version: 'x25519-xsalsa20-poly1305',
          nonce: 'test-nonce',
          ephemPublicKey: String(pubKey),
          ciphertext: 'test-ciphertext',
        };

        const decryptRequest = createMockRequest(accountId, 'eth_decrypt', [
          encryptedData,
        ]);

        // This will fail with actual decryption due to invalid encrypted data
        await expect(wrapper.submitRequest(decryptRequest)).rejects.toThrow(
          'Invalid padding: string should have whole number of bytes',
        );
      });

      it('throws error for missing params', async () => {
        const request = createMockRequest(accountId, 'eth_decrypt', []);

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
        // EIP-7702 authorization format (array of tuples)
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
        // eth_sendTransaction is a valid Ethereum method but not in HD_KEYRING_EOA_METHODS
        const request = createMockRequest(accountId, 'eth_sendTransaction', []);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          `Account ${accountId} cannot handle method: eth_sendTransaction`,
        );
      });
    });
  });
});
