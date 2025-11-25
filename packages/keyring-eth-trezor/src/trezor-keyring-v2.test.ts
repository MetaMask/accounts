import type { TypedTransaction } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
  type KeyringRequest,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';
import HDKey from 'hdkey';

import type { TrezorBridge } from './trezor-bridge';
import { TrezorKeyring } from './trezor-keyring';
import { TrezorKeyringV2 } from './trezor-keyring-v2';

const TEST_ENTROPY_SOURCE_ID = 'test-entropy-source-id';

const fakeXPubKey =
  'xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt';
const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKey);

/**
 * Creates a mock KeyringRequest for testing.
 *
 * @param accountId - The account ID for the request.
 * @param method - The method to invoke.
 * @param params - Optional parameters for the request.
 * @returns A mock KeyringRequest.
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
 * Get a mock bridge for the TrezorKeyring.
 *
 * @returns A mock bridge.
 */
function getMockBridge(): TrezorBridge {
  return {
    init: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn().mockResolvedValue(undefined),
    getPublicKey: jest.fn(),
    ethereumSignTransaction: jest.fn(),
    ethereumSignMessage: jest.fn(),
    ethereumSignTypedData: jest.fn(),
  } as unknown as TrezorBridge;
}

describe('TrezorKeyringV2', () => {
  let inner: TrezorKeyring;
  let wrapper: TrezorKeyringV2;
  let bridge: TrezorBridge;

  beforeEach(async () => {
    bridge = getMockBridge();
    inner = new TrezorKeyring({ bridge });
    await inner.init();
    // Set the HDKey directly to avoid needing a real unlock
    // eslint-disable-next-line require-atomic-updates
    inner.hdk = fakeHdKey;
    wrapper = new TrezorKeyringV2({
      legacyKeyring: inner,
      entropySourceId: TEST_ENTROPY_SOURCE_ID,
    });
  });

  it('constructs with expected type and capabilities', () => {
    expect(wrapper.type).toBe('trezor');
    expect(wrapper.capabilities.scopes).toStrictEqual([EthScope.Eoa]);
  });

  it('deserializes via the inner keyring and rebuilds the cache', async () => {
    await inner.addAccounts(2);
    const serializedState = await inner.serialize();

    await wrapper.deserialize(serializedState);

    const accounts = await wrapper.getAccounts();
    expect(accounts).toHaveLength(2);
  });

  describe('getAccounts and caching', () => {
    beforeEach(async () => {
      await inner.addAccounts(2);
    });

    it('returns accounts and caches them', async () => {
      const a1 = await wrapper.getAccounts();
      const a2 = await wrapper.getAccounts();

      expect(a1).toHaveLength(2);
      expect(a1[0]).toBe(a2[0]);
      expect(a1[1]).toBe(a2[1]);
    });

    it('sets entropy options as private-key type', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(2);

      for (const account of accounts) {
        expect(account.options.entropy).toBeDefined();
        expect(account.options.entropy?.type).toBe(
          KeyringAccountEntropyTypeOption.PrivateKey,
        );
      }
    });
  });

  describe('createAccounts', () => {
    it('creates an account via legacy keyring and returns it', async () => {
      const created = await wrapper.createAccounts();
      expect(created).toHaveLength(1);

      const all = await wrapper.getAccounts();
      expect(all).toHaveLength(1);
    });

    it('throws when the legacy keyring does not return an address', async () => {
      jest
        .spyOn(inner, 'addAccounts')
        .mockResolvedValueOnce([undefined] as unknown as Hex[]);

      await expect(wrapper.createAccounts()).rejects.toThrow(
        'Failed to create Trezor keyring account',
      );
    });
  });

  describe('deleteAccount', () => {
    beforeEach(async () => {
      await inner.addAccounts(2);
    });

    it('removes account from legacy and cache', async () => {
      const accounts = await wrapper.getAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(2);

      const toDelete = accounts[0];
      expect(toDelete).toBeDefined();

      if (toDelete?.id) {
        await wrapper.deleteAccount(toDelete.id);
      }

      const remaining = await wrapper.getAccounts();
      expect(remaining.find((a) => a.id === toDelete?.id)).toBeUndefined();
    });
  });

  describe('submitRequest', () => {
    let accountId: AccountId;

    beforeEach(async () => {
      const createdAccounts = await wrapper.createAccounts();
      const [account] = createdAccounts;
      if (!account) {
        throw new Error('Expected at least one account');
      }
      accountId = account.id;
    });

    it('signs a transaction', async () => {
      const tx = {} as unknown as TypedTransaction;

      const mockTx = {
        getSenderAddress: jest
          .fn()
          .mockReturnValue(Buffer.from('0'.repeat(40), 'hex')),
      } as unknown as TypedTransaction;

      const signTransactionSpy = jest
        .spyOn(inner, 'signTransaction')
        .mockResolvedValueOnce(mockTx);

      const req = createMockRequest(accountId, EthMethod.SignTransaction, [
        tx as unknown as Json,
      ]);

      // eslint-disable-next-line jest/no-restricted-matchers
      await expect(wrapper.submitRequest(req)).resolves.toStrictEqual(mockTx);

      expect(signTransactionSpy).toHaveBeenCalledWith(expect.any(String), tx);
    });

    it('throws when params are missing for eth_signTransaction', async () => {
      const req = createMockRequest(accountId, EthMethod.SignTransaction, []);

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        'Invalid params for eth_signTransaction',
      );
    });

    it('signs eth_sign', async () => {
      const signMessageSpy = jest
        .spyOn(inner, 'signMessage')
        .mockResolvedValueOnce('0xsignature');

      const req = createMockRequest(accountId, EthMethod.Sign, [
        '0x0000000000000000000000000000000000000000',
        '0x68656c6c6f',
      ]);
      const res = await wrapper.submitRequest(req);
      expect(res).toBe('0xsignature');
      expect(signMessageSpy).toHaveBeenCalledWith(
        expect.any(String),
        '0x68656c6c6f',
      );
    });

    it('throws when params are missing for eth_sign', async () => {
      const req = createMockRequest(accountId, EthMethod.Sign, []);

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        'Invalid params for eth_sign',
      );
    });

    it('signs personal_sign', async () => {
      const signPersonalMessageSpy = jest
        .spyOn(inner, 'signPersonalMessage')
        .mockResolvedValueOnce('0xsignature');

      const req = createMockRequest(accountId, EthMethod.PersonalSign, [
        '0x68656c6c6f',
      ]);
      const res = await wrapper.submitRequest(req);
      expect(res).toBe('0xsignature');
      expect(signPersonalMessageSpy).toHaveBeenCalledWith(
        expect.any(String),
        '0x68656c6c6f',
      );
    });

    it('throws when params are missing for personal_sign', async () => {
      const req = createMockRequest(accountId, EthMethod.PersonalSign, []);

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        'Invalid params for personal_sign',
      );
    });

    it('signs typed data V3', async () => {
      const typedData = { foo: 'bar3' };

      const signTypedDataSpy = jest
        .spyOn(inner, 'signTypedData')
        .mockResolvedValueOnce('0xv3');

      const req = createMockRequest(accountId, EthMethod.SignTypedDataV3, [
        '0x0000000000000000000000000000000000000000',
        typedData as unknown as Json,
      ]);

      const res = await wrapper.submitRequest(req);

      expect(res).toBe('0xv3');
      expect(signTypedDataSpy).toHaveBeenCalledWith(
        expect.any(String),
        typedData,
        { version: SignTypedDataVersion.V3 },
      );
    });

    it('signs typed data V4', async () => {
      const typedData = { foo: 'bar4' };

      const signTypedDataSpy = jest
        .spyOn(inner, 'signTypedData')
        .mockResolvedValueOnce('0xv4');

      const req = createMockRequest(accountId, EthMethod.SignTypedDataV4, [
        '0x0000000000000000000000000000000000000000',
        typedData as unknown as Json,
      ]);

      const res = await wrapper.submitRequest(req);

      expect(res).toBe('0xv4');
      expect(signTypedDataSpy).toHaveBeenCalledWith(
        expect.any(String),
        typedData,
        { version: SignTypedDataVersion.V4 },
      );
    });

    it('throws when params are missing for typed data methods', async () => {
      const req = createMockRequest(accountId, EthMethod.SignTypedDataV4, []);

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        `Invalid params for ${EthMethod.SignTypedDataV4}`,
      );
    });

    it('throws for unsupported method', async () => {
      const method = 'unsupported_method';
      const req = createMockRequest(accountId, method, []);
      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        `Unsupported method for TrezorKeyringV2: ${method}`,
      );
    });

    it('throws when params is not an array', async () => {
      const req = createMockRequest(accountId, EthMethod.PersonalSign, []);
      // @ts-expect-error Intentionally provide invalid params shape
      req.request.params = null;

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        'Expected params to be an array',
      );
    });

    it('defaults params to empty array when undefined', async () => {
      const req = createMockRequest(accountId, EthMethod.PersonalSign, []);
      delete req.request.params;

      await expect(wrapper.submitRequest(req)).rejects.toThrow(
        'Invalid params for personal_sign',
      );
    });
  });
});
