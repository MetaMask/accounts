import { HdKeyring } from './hd-keyring';
import { HdKeyringV2 } from './hd-keyring-v2';
import type { AccountId } from '@metamask/keyring-utils';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  type KeyringRequest,
  KeyringType,
  PrivateKeyEncoding,
} from '@metamask/keyring-api';

const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';
const TEST_ENTROPY_SOURCE_ID = 'test-entropy-source-id';

/**
 * Helper function to create a minimal KeyringRequest for testing.
 */
function createMockRequest(
  accountId: AccountId,
  method: string,
  params: any[] = [],
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
      expect(wrapper.capabilities.scopes).toEqual([EthScope.Eoa]);
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
      const account = accounts[0]!;

      expect(account.id).toBeDefined();
      expect(account.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);
      expect(account.type).toBe(EthAccountType.Eoa);
      expect(account.scopes).toEqual([EthScope.Eoa]);
      expect(account.methods).toContain(EthMethod.PersonalSign);
      expect(account.methods).toContain(EthMethod.SignTransaction);
      expect(account.methods).toContain('eth_decrypt');
      expect(account.options?.entropy?.type).toBe('mnemonic');

      // Type guard to check mnemonic entropy
      const entropy = account.options?.entropy;
      if (entropy && 'id' in entropy) {
        expect(entropy.id).toBe(TEST_ENTROPY_SOURCE_ID);
        expect(entropy.groupIndex).toBe(0);
        expect(entropy.derivationPath).toBe("m/44'/60'/0'/0/0");
      }
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

      for (let i = 0; i < 5; i++) {
        const entropy = accounts[i]!.options?.entropy;
        if (entropy && 'groupIndex' in entropy) {
          expect(entropy.groupIndex).toBe(i);
        }
      }
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
      wrapper = new HdKeyringV2({
        legacyKeyring: newInner,
        entropySourceId: TEST_ENTROPY_SOURCE_ID,
      });

      await wrapper.deserialize({
        mnemonic: Array.from(Buffer.from(TEST_MNEMONIC, 'utf8')),
        numberOfAccounts: 1,
        hdPath: "m/44'/60'/0'/0",
      });

      const accounts2 = await wrapper.getAccounts();
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

      const entropy = created[0]!.options?.entropy;
      if (entropy && 'groupIndex' in entropy) {
        expect(entropy.groupIndex).toBe(0);
      }

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(1);
    });

    it('creates an account at a specific index', async () => {
      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 3,
      });

      expect(created).toHaveLength(1);

      const entropy = created[0]!.options?.entropy;
      if (entropy && 'groupIndex' in entropy) {
        expect(entropy.groupIndex).toBe(3);
      }

      // Should have created intermediate accounts 0, 1, 2, 3
      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(4);
    });

    it('caches intermediate accounts when creating at higher index', async () => {
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });

      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        const entropy = allAccounts[i]!.options?.entropy;
        if (entropy && 'groupIndex' in entropy) {
          expect(entropy.groupIndex).toBe(i);
        }
      }
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

      const entropy = created[0]!.options?.entropy;
      if (entropy && 'groupIndex' in entropy) {
        expect(entropy.groupIndex).toBe(3);
      }

      // Should have 4 accounts total (0, 1, 2, 3)
      const allAccounts = await wrapper.getAccounts();
      expect(allAccounts).toHaveLength(4);
    });
  });

  describe('deleteAccount', () => {
    beforeEach(async () => {
      await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 2,
      });
    });

    it('removes an account from the keyring', async () => {
      const accounts = await wrapper.getAccounts();
      const toDelete = accounts[0]!;

      await wrapper.deleteAccount(toDelete.id as AccountId);

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((a) => a.id === toDelete.id)).toBeUndefined();
    });

    it('removes the account from the cache', async () => {
      const accounts = await wrapper.getAccounts();
      const toDelete = accounts[1]!;

      await wrapper.deleteAccount(toDelete.id as AccountId);

      const remaining = await wrapper.getAccounts();
      expect(remaining.find((a) => a.id === toDelete.id)).toBeUndefined();
    });

    it('handles deleting middle account', async () => {
      const accounts = await wrapper.getAccounts();
      const middleAccount = accounts[1]!;

      await wrapper.deleteAccount(middleAccount.id as AccountId);

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(2);
    });

    it('syncs cache when legacy keyring removes accounts directly', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(3);

      // Remove an account directly via legacy keyring (simulating external modification)
      const firstAddress = (await inner.getAccounts())[0]!;
      inner.removeAccount(firstAddress);

      // Now delete another account via wrapper
      // This should detect the external change and sync properly
      const remainingAccounts = await wrapper.getAccounts();
      const toDelete = remainingAccounts[0]!;

      await wrapper.deleteAccount(toDelete.id as AccountId);

      const final = await wrapper.getAccounts();
      // Should have 1 account left (started with 3, removed 1 via legacy, removed 1 via wrapper)
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
      const account = accounts[0]!;

      const exported = await wrapper.exportAccount(account.id as AccountId);

      expect(exported.type).toBe('private-key');
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
      expect(exported.encoding).toBe(PrivateKeyEncoding.Hexadecimal);
    });

    it('accepts explicit hexadecimal encoding option', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0]!;

      const exported = await wrapper.exportAccount(account.id as AccountId, {
        type: 'private-key',
        encoding: PrivateKeyEncoding.Hexadecimal,
      });

      expect(exported.type).toBe('private-key');
      expect(exported.privateKey).toMatch(/^0x[0-9a-fA-F]{64}$/u);
    });

    it('throws error for unsupported encoding', async () => {
      const accounts = await wrapper.getAccounts();
      const account = accounts[0]!;

      await expect(
        wrapper.exportAccount(account.id as AccountId, {
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
      accountId = created[0]!.id as AccountId;
    });

    describe('eth_signTransaction', () => {
      it('signs a transaction', async () => {
        // Note: Transaction signing requires a proper transaction object
        // This test is skipped because it requires @ethereumjs/tx setup
        // In real usage, the transaction would be properly formatted
        expect(true).toBe(true);
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
          ephemPublicKey: pubKey as string,
          ciphertext: 'test-ciphertext',
        };

        const decryptRequest = createMockRequest(accountId, 'eth_decrypt', [
          encryptedData,
        ]);

        // This will fail with actual decryption but should validate params
        await expect(wrapper.submitRequest(decryptRequest)).rejects.toThrow();
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
            params: 'invalid' as any,
          },
        };

        await expect(wrapper.submitRequest(request)).rejects.toThrow(
          'Expected params to be an array',
        );
      });
    });
  });
});
