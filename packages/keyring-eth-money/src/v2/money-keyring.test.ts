import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';
import type { KeyringRequest } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';
import { EthKeyringMethod } from '@metamask/keyring-sdk/v2';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

import {
  MoneyKeyring as LegacyMoneyKeyring,
  MONEY_DERIVATION_PATH,
} from '../money-keyring';
import { MoneyKeyring } from './money-keyring';

const TEST_MNEMONIC =
  'finish oppose decorate face calm tragic certain desk hour urge dinosaur mango';

const TEST_ENTROPY_SOURCE_ID = 'test-entropy-source-id';

/**
 * Address derived from {@link TEST_MNEMONIC} at index 0 of {@link MONEY_DERIVATION_PATH}.
 */
const TEST_ADDRESS = '0x13203ef2a0e1fb26bfddcaf86a4a7d08a52d78aa' as Hex;

/**
 * Encode a BIP-39 mnemonic string as the UTF-8 byte array expected by the
 * legacy {@link LegacyMoneyKeyring} `getMnemonic` callback.
 *
 * @param mnemonic - The mnemonic phrase.
 * @returns The mnemonic as a `number[]` of UTF-8 byte values.
 */
function mnemonicToBytes(mnemonic: string): number[] {
  return Array.from(new TextEncoder().encode(mnemonic));
}

/**
 * Build a minimal {@link KeyringRequest} for use with `submitRequest`.
 *
 * @param accountId - The account ID to use in the request.
 * @param method - The RPC method name.
 * @param params - Optional params array.
 * @returns A {@link KeyringRequest} for testing.
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

/**
 * Create a configured legacy {@link LegacyMoneyKeyring} and wrap it with the
 * v2 {@link MoneyKeyring} adapter.
 *
 * @param options - Setup options.
 * @param options.withAccount - When true, the inner keyring will have its
 * single account pre-derived via `addAccounts()`. Implies `deserialize`.
 * @param options.deserialize - When true (default), the inner keyring is
 * deserialized with `entropySource`. Set to false to obtain a wrapper around
 * an inner keyring that has never been deserialized.
 * @param options.entropySource - Entropy source ID to deserialize the inner
 * keyring with. Defaults to {@link TEST_ENTROPY_SOURCE_ID}.
 * @param options.mnemonic - Mnemonic to return from the `getMnemonic`
 * callback. Defaults to {@link TEST_MNEMONIC}.
 * @returns The inner legacy keyring, the v2 wrapper, and the mocked
 * `getMnemonic` callback.
 */
async function setup({
  withAccount = false,
  deserialize = true,
  entropySource = TEST_ENTROPY_SOURCE_ID,
  mnemonic = TEST_MNEMONIC,
}: {
  withAccount?: boolean;
  deserialize?: boolean;
  entropySource?: string;
  mnemonic?: string;
} = {}): Promise<{
  inner: LegacyMoneyKeyring;
  wrapper: MoneyKeyring;
  getMnemonic: jest.Mock<Promise<number[]>, [string]>;
}> {
  const getMnemonic = jest
    .fn<Promise<number[]>, [string]>()
    .mockResolvedValue(mnemonicToBytes(mnemonic));

  const inner = new LegacyMoneyKeyring({ getMnemonic });

  if (deserialize || withAccount) {
    await inner.deserialize({ entropySource });
  }

  if (withAccount) {
    await inner.addAccounts();
  }

  const wrapper = new MoneyKeyring(inner);

  return { inner, wrapper, getMnemonic };
}

describe('MoneyKeyring (v2 wrapper)', () => {
  describe('constructor', () => {
    it('exposes the configured type and capabilities', async () => {
      const { wrapper } = await setup();

      expect(wrapper.type).toBe(KeyringType.Money);
      expect(wrapper.capabilities.scopes).toStrictEqual([EthScope.Eoa]);
      expect(wrapper.capabilities.bip44?.deriveIndex).toBe(true);
      expect(wrapper.capabilities.bip44?.derivePath).toBeUndefined();
      expect(wrapper.capabilities.bip44?.deriveIndexRange).toBeUndefined();
      expect(wrapper.capabilities.bip44?.discover).toBeUndefined();
    });
  });

  describe('entropySource', () => {
    it('returns the inner keyring entropy source', async () => {
      const { wrapper } = await setup();
      expect(wrapper.entropySource).toBe(TEST_ENTROPY_SOURCE_ID);
    });

    it('returns undefined when the inner keyring has not been deserialized', async () => {
      const { wrapper } = await setup({ deserialize: false });

      expect(wrapper.entropySource).toBeUndefined();
    });
  });

  describe('getAccounts', () => {
    it('returns the single account exposed by the inner keyring', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address.toLowerCase()).toBe(TEST_ADDRESS);
    });

    it('produces a KeyringAccount with the expected shape and entropy metadata', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const [account] = await wrapper.getAccounts();
      expect(account).toBeDefined();
      expect(account?.id).toBeDefined();
      expect(account?.type).toBe(EthAccountType.Eoa);
      expect(account?.scopes).toStrictEqual([EthScope.Eoa]);
      expect(account?.address).toMatch(/^0x[0-9a-fA-F]{40}$/u);

      // MoneyKeyring exposes a strict subset of methods.
      expect(account?.methods).toStrictEqual([
        EthMethod.PersonalSign,
        EthMethod.SignTypedDataV1,
        EthMethod.SignTypedDataV3,
        EthMethod.SignTypedDataV4,
        EthKeyringMethod.SignEip7702Authorization,
      ]);

      const entropy = account?.options?.entropy;
      expect(entropy).toBeDefined();
      expect(entropy?.type).toBe(KeyringAccountEntropyTypeOption.Mnemonic);
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
      ).toBe(`${MONEY_DERIVATION_PATH}/0`);
    });

    it('caches the account between calls', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const first = await wrapper.getAccounts();
      const second = await wrapper.getAccounts();

      expect(first[0]).toBeDefined();
      expect(second[0]).toBe(first[0]);
    });

    it('returns an empty array when the inner keyring has no account yet', async () => {
      const { wrapper } = await setup();

      expect(await wrapper.getAccounts()).toStrictEqual([]);
    });

    it('throws when the inner keyring exposes more than one account', async () => {
      const { inner, wrapper } = await setup({ withAccount: true });
      jest
        .spyOn(inner, 'getAccounts')
        .mockResolvedValue([
          '0x0000000000000000000000000000000000000001',
          '0x0000000000000000000000000000000000000002',
        ]);

      await expect(wrapper.getAccounts()).rejects.toThrow(
        'MoneyKeyring: supports at most one account',
      );
    });

    it('throws when the inner keyring has not been deserialized', async () => {
      const { wrapper } = await setup({ deserialize: false });

      await expect(wrapper.getAccounts()).rejects.toThrow(
        'MoneyKeyring: not yet deserialized',
      );
    });
  });

  describe('getAccount', () => {
    it('returns the cached account by id', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const [account] = await wrapper.getAccounts();
      expect(account).toBeDefined();

      const fetched = await wrapper.getAccount(account?.id as AccountId);
      expect(fetched).toBe(account);
    });

    it('throws when no account matches the given id', async () => {
      const { wrapper } = await setup({ withAccount: true });
      // Prime the registry.
      await wrapper.getAccounts();

      await expect(
        wrapper.getAccount('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow('Account not found for id');
    });
  });

  describe('createAccounts', () => {
    it('rejects unsupported account creation types', async () => {
      const { wrapper } = await setup({ withAccount: true });

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-path',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          derivationPath: `${MONEY_DERIVATION_PATH}/0`,
        }),
      ).rejects.toThrow(
        'Unsupported account creation type for MoneyKeyring: bip44:derive-path',
      );
    });

    it('throws when the inner keyring has not been deserialized', async () => {
      const { wrapper } = await setup({ deserialize: false });

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 0,
        }),
      ).rejects.toThrow('MoneyKeyring: not yet deserialized');
    });

    it('rejects when the entropy source does not match the inner keyring', async () => {
      const { wrapper } = await setup({ withAccount: true });

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: 'some-other-source',
          groupIndex: 0,
        }),
      ).rejects.toThrow(
        `Entropy source mismatch: expected '${TEST_ENTROPY_SOURCE_ID}', got 'some-other-source'`,
      );
    });

    it('rejects any groupIndex other than 0', async () => {
      const { wrapper } = await setup({ withAccount: true });

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 1,
        }),
      ).rejects.toThrow(
        'MoneyKeyring: supports only creating the first account, groupIndex must be 0',
      );
    });

    it('returns the existing account when one already exists', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const [existing] = await wrapper.getAccounts();
      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(created).toHaveLength(1);
      expect(created[0]).toBe(existing);
    });

    it('creates the first account when the inner keyring is empty', async () => {
      const { wrapper } = await setup();

      const created = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });

      expect(created).toHaveLength(1);
      const account = created[0];
      expect(account?.address.toLowerCase()).toBe(TEST_ADDRESS);

      const entropy = account?.options?.entropy;
      expect(entropy?.type).toBe(KeyringAccountEntropyTypeOption.Mnemonic);
      expect(
        entropy && 'groupIndex' in entropy ? entropy.groupIndex : undefined,
      ).toBe(0);
      expect(
        entropy && 'derivationPath' in entropy
          ? entropy.derivationPath
          : undefined,
      ).toBe(`${MONEY_DERIVATION_PATH}/0`);

      // Subsequent calls should return the same cached account.
      const second = await wrapper.createAccounts({
        type: 'bip44:derive-index',
        entropySource: TEST_ENTROPY_SOURCE_ID,
        groupIndex: 0,
      });
      expect(second[0]).toBe(account);
    });

    it('throws when the inner keyring fails to return a new address', async () => {
      const { inner, wrapper } = await setup();
      jest.spyOn(inner, 'addAccounts').mockResolvedValueOnce([]);

      await expect(
        wrapper.createAccounts({
          type: 'bip44:derive-index',
          entropySource: TEST_ENTROPY_SOURCE_ID,
          groupIndex: 0,
        }),
      ).rejects.toThrow('MoneyKeyring: failed to add account');
    });
  });

  describe('deleteAccount', () => {
    it('is a no-op (MoneyKeyring does not support deletion)', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const [account] = await wrapper.getAccounts();
      const accountId = account?.id;
      expect(accountId).toBeDefined();

      expect(
        await wrapper.deleteAccount(accountId as AccountId),
      ).toBeUndefined();

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.id).toBe(accountId);
    });

    it('is a no-op even when the id does not exist', async () => {
      const { wrapper } = await setup({ withAccount: true });

      expect(
        await wrapper.deleteAccount('00000000-0000-0000-0000-000000000000'),
      ).toBeUndefined();

      const remaining = await wrapper.getAccounts();
      expect(remaining).toHaveLength(1);
    });
  });

  describe('serialize', () => {
    it('delegates to the inner keyring', async () => {
      const { wrapper } = await setup({ withAccount: true });

      const serialized = await wrapper.serialize();
      expect(serialized).toStrictEqual({
        entropySource: TEST_ENTROPY_SOURCE_ID,
        account: TEST_ADDRESS,
      });
    });
  });

  describe('deserialize', () => {
    it('hydrates the inner keyring from a state that contains an account', async () => {
      const inner = new LegacyMoneyKeyring({
        getMnemonic: jest
          .fn<Promise<number[]>, [string]>()
          .mockResolvedValue(mnemonicToBytes(TEST_MNEMONIC)),
      });
      const wrapper = new MoneyKeyring(inner);

      await wrapper.deserialize({
        entropySource: TEST_ENTROPY_SOURCE_ID,
        account: TEST_ADDRESS,
      });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address.toLowerCase()).toBe(TEST_ADDRESS);
      expect(wrapper.entropySource).toBe(TEST_ENTROPY_SOURCE_ID);
    });
  });

  describe('submitRequest', () => {
    let wrapper: MoneyKeyring;
    let accountId: AccountId;

    beforeEach(async () => {
      ({ wrapper } = await setup({ withAccount: true }));
      const [account] = await wrapper.getAccounts();
      accountId = account?.id ?? '';
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

      it('throws when params are missing', async () => {
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
          { type: 'string', name: 'Message', value: 'Hi, Alice!' },
        ];

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV1,
          ['0x0000000000000000000000000000000000000000', typedData],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
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
          domain: { name: 'Test', version: '1', chainId: 1 },
          primaryType: 'Message',
          message: { content: 'Hello!' },
        };

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV3,
          ['0x0000000000000000000000000000000000000000', typedData],
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
          domain: { name: 'Test', version: '1', chainId: 1 },
          primaryType: 'Message',
          message: { content: 'Hello!' },
        };

        const request = createMockRequest(
          accountId,
          EthMethod.SignTypedDataV4,
          ['0x0000000000000000000000000000000000000000', typedData],
        );

        const result = await wrapper.submitRequest(request);
        expect(typeof result).toBe('string');
      });
    });

    describe('eth_signEip7702Authorization', () => {
      it('signs an EIP-7702 authorization', async () => {
        const authorization = [
          1,
          '0x0000000000000000000000000000000000000001',
          0,
        ];

        const request = createMockRequest(
          accountId,
          'eth_signEip7702Authorization',
          [authorization],
        );

        const result = await wrapper.submitRequest(request);
        expect(result).toBeDefined();
      });

      it('throws when params are missing', async () => {
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
  });
});
