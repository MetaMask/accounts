import { TransactionFactory, type TypedTxData } from '@ethereumjs/tx';
import {
  EthAccountType,
  EthMethod,
  EthScope,
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
      entropySourceId: TEST_ENTROPY_SOURCE_ID,
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
        entropySourceId: TEST_ENTROPY_SOURCE_ID,
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
        entropySourceId: TEST_ENTROPY_SOURCE_ID,
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

    it('removes an account from the keyring', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts.length).toBeGreaterThan(0);
      const toDelete = accounts[0];
      expect(toDelete).toBeDefined();
      expect(toDelete?.id).toBeDefined();

      if (toDelete?.id) {
        await wrapper.deleteAccount(toDelete.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((a) => a.id === toDelete?.id)).toBeUndefined();
    });

    it('removes the account from the cache', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(2);
      const toDelete = accounts[1];
      expect(toDelete).toBeDefined();
      expect(toDelete?.id).toBeDefined();

      if (toDelete?.id) {
        await wrapper.deleteAccount(toDelete.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining.find((a) => a.id === toDelete?.id)).toBeUndefined();
    });

    it('handles deleting middle account', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(2);
      const middleAccount = accounts[1];
      expect(middleAccount).toBeDefined();
      expect(middleAccount?.id).toBeDefined();

      if (middleAccount?.id) {
        await wrapper.deleteAccount(middleAccount.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
    });

    it('syncs cache when legacy keyring removes accounts directly', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      // Remove an account directly via legacy keyring (simulating external modification)
      const innerAccounts = await inner.getAccounts();
      expect(innerAccounts.length).toBeGreaterThan(0);
      const firstAddress = innerAccounts[0];
      expect(firstAddress).toBeDefined();

      // Type assertion safe here because we verified it exists
      if (firstAddress) {
        inner.removeAccount(firstAddress);
      }

      // Now delete another account via wrapper
      // This should detect the external change and sync properly
      const remainingAccounts = await wrapper.getAccounts();
      expect(remainingAccounts.length).toBeGreaterThan(0);
      const toDelete = remainingAccounts[0];
      expect(toDelete).toBeDefined();
      expect(toDelete?.id).toBeDefined();

      if (toDelete?.id) {
        await wrapper.deleteAccount(toDelete.id);
      }

      const final = await wrapper.getAccounts();
      // Should have 1 account left (started with 3, removed 1 via legacy, removed 1 via wrapper)
      expect(final).toHaveLength(1);
    });

    it('returns correct account by groupIndex after deletion', async () => {
      // Create accounts at indices 0, 1, 2
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      const account0 = accounts.find(
        (a) =>
          a.options.entropy &&
          'groupIndex' in a.options.entropy &&
          a.options.entropy.groupIndex === 0,
      );
      const account1 = accounts.find(
        (a) =>
          a.options.entropy &&
          'groupIndex' in a.options.entropy &&
          a.options.entropy.groupIndex === 1,
      );
      const account2 = accounts.find(
        (a) =>
          a.options.entropy &&
          'groupIndex' in a.options.entropy &&
          a.options.entropy.groupIndex === 2,
      );

      expect(account0).toBeDefined();
      expect(account1).toBeDefined();
      expect(account2).toBeDefined();

      // Delete account at groupIndex 1
      if (account1?.id) {
        await wrapper.deleteAccount(account1.id);
      }

      // After deletion, we should have accounts with groupIndex 0 and 2
      // but they'll be at array positions 0 and 1
      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);

      // Now try to create an account at groupIndex 1 again
      // This should return the EXISTING account at groupIndex 2, NOT create a new one
      // The bug was that it would use array position [1] which is the account with groupIndex 2
      const result = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      // Should return the existing account with groupIndex 2
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(account2?.id);
      expect(result[0]?.address).toBe(account2?.address);

      // Should still have 2 accounts total
      const final = await wrapper.getAccounts();
      expect(final).toHaveLength(2);
    });

    it('rejects creating account at non-sequential groupIndex after deletion', async () => {
      // Create accounts at indices 0, 1, 2
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      const account1 = accounts.find(
        (a) =>
          a.options.entropy &&
          'groupIndex' in a.options.entropy &&
          a.options.entropy.groupIndex === 1,
      );

      expect(account1).toBeDefined();

      // Delete account at groupIndex 1
      if (account1?.id) {
        await wrapper.deleteAccount(account1.id);
      }

      // After deletion, we have accounts with groupIndex 0 and 2 (inner size is 2)
      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);

      // Now try to create an account at groupIndex 3 (higher than inner size of 2)
      // This should fail because the inner keyring only supports sequential creation at index 2
      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 3,
        }),
      ).rejects.toThrow(
        'Cannot create account at group index 3: inner keyring only supports sequential creation at index 2',
      );

      // Verify we can still create at the next sequential index (2)
      // But this already exists, so it should return the existing account
      const result = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      expect(result).toHaveLength(1);
      const newAccount = result[0];
      const entropy = newAccount?.options.entropy;
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(2);

      // Should still have 2 accounts total (the account at index 2 already existed)
      const final = await wrapper.getAccounts();
      expect(final).toHaveLength(2);
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
        const tx = TransactionFactory.fromTxData(txParams);

        const request = createMockRequest(
          accountId,
          EthMethod.SignTransaction,
          [tx as unknown as Json],
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
          'Invalid params for eth_signTransaction',
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
          'Invalid params for eth_sign',
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
          'Invalid params for personal_sign',
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
          'Invalid params for eth_signTypedData_v1',
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
          [],
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
          [],
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
          'Invalid params for eth_decrypt',
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
          'Invalid params for eth_getAppKeyAddress',
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
          'Invalid params for eth_signEip7702Authorization',
        );
      });
    });

    describe('unsupported methods', () => {
      it('throws error for unsupported method', async () => {
        const request = createMockRequest(accountId, 'unsupported_method', []);

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          'Unsupported method for HdKeyringWrapper',
        );
      });
    });

    describe('params validation', () => {
      it('throws error when params is not an array', async () => {
        const request = {
          id: '00000000-0000-0000-0000-000000000000',
          scope: EthScope.Eoa,
          account: accountId,
          origin: 'http://localhost',
          request: {
            method: EthMethod.PersonalSign,
            params: 'invalid' as unknown as Json[],
          },
        };

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          'Expected params to be an array',
        );
      });
    });
  });
});
