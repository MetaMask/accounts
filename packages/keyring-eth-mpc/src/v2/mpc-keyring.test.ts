import type { TypedTxData } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
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

import type { MpcKeyring as MpcKeyringV1 } from '../types';
import { MpcKeyring } from './mpc-keyring';
import type { MpcCreateAccountOptions } from './mpc-keyring';

const MOCK_ADDRESS = '0x1111111111111111111111111111111111111111' as Hex;
const OTHER_ADDRESS = '0x2222222222222222222222222222222222222222' as Hex;

/**
 * Expected methods supported by MPC keyring accounts.
 */
const EXPECTED_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.SignEip7702Authorization,
];

/**
 * The legacy MPC keyring methods that the V2 wrapper delegates to, mocked
 * for testing.
 */
type MockMpcKeyringV1 = {
  type: string;
  getAccounts: jest.Mock;
  init: jest.Mock;
  serialize: jest.Mock;
  deserialize: jest.Mock;
  addAccounts: jest.Mock;
  getAppKeyAddress: jest.Mock;
  signTransaction: jest.Mock;
  signPersonalMessage: jest.Mock;
  signTypedData: jest.Mock;
  signEip7702Authorization: jest.Mock;
  rotateKeyShares: jest.Mock;
  checkKeyShare: jest.Mock;
  syncKeyShare: jest.Mock;
};

/**
 * Create a mock of the legacy MPC keyring with all the methods the V2
 * wrapper delegates to.
 *
 * @returns The mocked inner keyring.
 */
function createInner(): MockMpcKeyringV1 {
  return {
    type: 'MPC Keyring',
    getAccounts: jest.fn().mockResolvedValue([] as Hex[]),
    init: jest.fn().mockResolvedValue(undefined),
    serialize: jest.fn().mockResolvedValue({}),
    deserialize: jest.fn().mockResolvedValue(undefined),
    addAccounts: jest.fn(),
    getAppKeyAddress: jest.fn(),
    signTransaction: jest.fn(),
    signPersonalMessage: jest.fn(),
    signTypedData: jest.fn(),
    signEip7702Authorization: jest.fn(),
    rotateKeyShares: jest.fn().mockResolvedValue(undefined),
    checkKeyShare: jest.fn().mockResolvedValue(true),
    syncKeyShare: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Create a V2 wrapper around a mocked legacy MPC keyring.
 *
 * @param args - Setup arguments.
 * @param args.accounts - The addresses reported by the inner keyring.
 * @returns The wrapper and the mocked inner keyring.
 */
function setup({
  accounts = [] as Hex[],
}: {
  accounts?: Hex[];
} = {}): {
  wrapper: MpcKeyring;
  inner: MockMpcKeyringV1;
} {
  const inner = createInner();
  inner.getAccounts.mockResolvedValue(accounts);

  const wrapper = new MpcKeyring({
    legacyKeyring: inner as unknown as MpcKeyringV1,
  });

  return { wrapper, inner };
}

/**
 * Create a wrapper whose inner keyring already manages the single account,
 * and resolve the registered account ID.
 *
 * @returns The wrapper, the mocked inner keyring, and the account ID.
 */
async function createWrapperWithAccount(): Promise<{
  wrapper: MpcKeyring;
  inner: MockMpcKeyringV1;
  accountId: AccountId;
}> {
  const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });
  const [account] = await wrapper.getAccounts();
  const accountId = account?.id ?? ('' as AccountId);
  return { wrapper, inner, accountId };
}

/**
 * Create a minimal `KeyringRequest` for testing.
 *
 * @param accountId - The account ID to use in the request.
 * @param method - The method name for the request.
 * @param params - Optional array of parameters for the request.
 * @returns A `KeyringRequest` object.
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

describe('MpcKeyring (v2 wrapper)', () => {
  describe('constructor', () => {
    it('creates a wrapper with the correct type and capabilities', () => {
      const { wrapper } = setup();

      expect(wrapper.type).toBe(KeyringType.Mpc);
      expect(wrapper.type).toBe('mpc');
      expect(wrapper.capabilities).toStrictEqual({
        scopes: [EthScope.Eoa],
        custom: {
          createAccounts: true,
        },
      });
    });
  });

  describe('getAccounts', () => {
    it('returns an empty list when the inner keyring is not initialized', async () => {
      const { wrapper } = setup();

      expect(await wrapper.getAccounts()).toStrictEqual([]);
    });

    it('returns the single account with the expected structure', async () => {
      const { wrapper } = setup({ accounts: [MOCK_ADDRESS] });

      const accounts = await wrapper.getAccounts();

      expect(accounts).toHaveLength(1);
      const account = accounts[0];
      expect(account?.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
      );
      expect(account?.type).toBe(EthAccountType.Eoa);
      expect(account?.address).toBe(MOCK_ADDRESS);
      expect(account?.scopes).toStrictEqual([EthScope.Eoa]);
      expect(account?.methods).toStrictEqual(EXPECTED_METHODS);
      expect(account?.options.entropy?.type).toBe(
        KeyringAccountEntropyTypeOption.Custom,
      );
    });

    it('returns the same account on repeated calls', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });

      const [first] = await wrapper.getAccounts();
      const [second] = await wrapper.getAccounts();

      expect(second?.id).toBe(first?.id);
      expect(inner.getAccounts).toHaveBeenCalledTimes(2);
    });

    it('throws if the inner keyring reports more than one account', async () => {
      const { wrapper, inner } = setup();
      inner.getAccounts.mockResolvedValue([MOCK_ADDRESS, OTHER_ADDRESS]);

      await expect(wrapper.getAccounts()).rejects.toThrow(
        'MpcKeyring: supports at most one account',
      );
    });
  });

  describe('createAccounts', () => {
    it('runs the create ceremony via the inner keyring', async () => {
      const { wrapper, inner } = setup();
      inner.getAccounts
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([MOCK_ADDRESS]);

      const accounts = await wrapper.createAccounts({
        type: 'custom',
        mode: 'create',
      });

      expect(inner.init).toHaveBeenCalledWith('create');
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(MOCK_ADDRESS);
    });

    it('runs the backup import flow via the inner keyring', async () => {
      const { wrapper, inner } = setup();
      inner.getAccounts
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([MOCK_ADDRESS]);

      const accounts = await wrapper.createAccounts({
        type: 'custom',
        mode: 'import',
      });

      expect(inner.init).toHaveBeenCalledWith('import');
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(MOCK_ADDRESS);
    });

    it('falls back to the setup params stored via deserialize when mode is omitted', async () => {
      const { wrapper, inner } = setup();
      inner.getAccounts
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([MOCK_ADDRESS]);

      const accounts = await wrapper.createAccounts({ type: 'custom' });

      expect(inner.init).toHaveBeenCalledWith(undefined);
      expect(accounts).toHaveLength(1);
    });

    it('is idempotent when the account already exists', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });

      const accounts = await wrapper.createAccounts({
        type: 'custom',
        mode: 'create',
      });

      expect(inner.init).not.toHaveBeenCalled();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(MOCK_ADDRESS);
    });

    it('throws when the inner keyring does not produce an account', async () => {
      const { wrapper, inner } = setup();

      await expect(
        wrapper.createAccounts({ type: 'custom', mode: 'create' }),
      ).rejects.toThrow('MpcKeyring: account creation failed');

      expect(inner.init).toHaveBeenCalledWith('create');
    });

    it('rejects unsupported account creation types', async () => {
      const { wrapper, inner } = setup();

      const invalidOptions = {
        type: 'bip44:derive-index',
        entropySource: 'entropy-source',
        groupIndex: 0,
      } as unknown as MpcCreateAccountOptions;

      await expect(wrapper.createAccounts(invalidOptions)).rejects.toThrow(
        'MpcKeyring: unsupported account creation type: bip44:derive-index',
      );
      expect(inner.init).not.toHaveBeenCalled();
    });

    it('rejects an invalid mode', async () => {
      const { wrapper, inner } = setup();

      const invalidOptions = {
        type: 'custom',
        mode: 'bogus',
      } as unknown as MpcCreateAccountOptions;

      await expect(wrapper.createAccounts(invalidOptions)).rejects.toThrow(
        "MpcKeyring: invalid mode: bogus. Expected 'create' or 'import'.",
      );
      expect(inner.init).not.toHaveBeenCalled();
    });
  });

  describe('getAccount', () => {
    it('returns the account by id', async () => {
      const { wrapper } = setup({ accounts: [MOCK_ADDRESS] });

      const [account] = await wrapper.getAccounts();

      expect(
        await wrapper.getAccount(account?.id ?? ('' as AccountId)),
      ).toStrictEqual(account);
    });

    it('throws for an unknown account id', async () => {
      const { wrapper } = setup({ accounts: [MOCK_ADDRESS] });

      await expect(
        wrapper.getAccount('00000000-0000-0000-0000-000000000000' as AccountId),
      ).rejects.toThrow(
        'Account not found for id: 00000000-0000-0000-0000-000000000000',
      );
    });
  });

  describe('deleteAccount', () => {
    it('rejects deletion', async () => {
      const { wrapper } = setup({ accounts: [MOCK_ADDRESS] });

      const [account] = await wrapper.getAccounts();

      await expect(
        wrapper.deleteAccount(account?.id ?? ('' as AccountId)),
      ).rejects.toThrow('MpcKeyring: deleting accounts is not supported');
    });
  });

  describe('serialize and deserialize', () => {
    it('delegates serialization to the inner keyring', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });
      inner.serialize.mockResolvedValue({ keyShare: 'mock' });

      expect(await wrapper.serialize()).toStrictEqual({
        keyShare: 'mock',
      });
      expect(inner.serialize).toHaveBeenCalledTimes(1);
    });

    it('delegates deserialization and rebuilds the account registry', async () => {
      const { wrapper, inner } = setup();
      inner.getAccounts.mockResolvedValue([MOCK_ADDRESS]);

      await wrapper.deserialize({ keyShare: 'mock' });

      expect(inner.deserialize).toHaveBeenCalledWith({ keyShare: 'mock' });

      const accounts = await wrapper.getAccounts();
      expect(accounts).toHaveLength(1);
      expect(accounts[0]?.address).toBe(MOCK_ADDRESS);

      // The registry was rebuilt during deserialization, so `getAccount`
      // resolves from the cache without consulting the inner keyring again.
      const callCount = inner.getAccounts.mock.calls.length;
      expect(
        await wrapper.getAccount(accounts[0]?.id ?? ('' as AccountId)),
      ).toBeDefined();
      expect(inner.getAccounts).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('MPC maintenance operations', () => {
    it('delegates rotateKeyShares to the inner keyring', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });

      await wrapper.rotateKeyShares();

      expect(inner.rotateKeyShares).toHaveBeenCalledTimes(1);
    });

    it('delegates checkKeyShare to the inner keyring', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });
      inner.checkKeyShare.mockResolvedValue(false);

      expect(await wrapper.checkKeyShare()).toBe(false);
      expect(inner.checkKeyShare).toHaveBeenCalledTimes(1);
    });

    it('delegates syncKeyShare to the inner keyring', async () => {
      const { wrapper, inner } = setup({ accounts: [MOCK_ADDRESS] });

      await wrapper.syncKeyShare();

      expect(inner.syncKeyShare).toHaveBeenCalledTimes(1);
    });
  });

  describe('submitRequest', () => {
    it('signs a personal message via the inner keyring', async () => {
      const { wrapper, inner, accountId } = await createWrapperWithAccount();
      inner.signPersonalMessage.mockResolvedValue('0xsignature');

      const result = await wrapper.submitRequest(
        createMockRequest(accountId, EthMethod.PersonalSign, ['0x68656c6c6f']),
      );

      expect(result).toBe('0xsignature');
      expect(inner.signPersonalMessage).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        '0x68656c6c6f',
      );
    });

    it('signs typed data v4 via the inner keyring', async () => {
      const { wrapper, inner, accountId } = await createWrapperWithAccount();
      inner.signTypedData.mockResolvedValue('0xsignature');

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

      const result = await wrapper.submitRequest(
        createMockRequest(accountId, EthMethod.SignTypedDataV4, [
          MOCK_ADDRESS,
          typedData,
        ]),
      );

      expect(result).toBe('0xsignature');
      expect(inner.signTypedData).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        typedData,
        { version: SignTypedDataVersion.V4 },
      );
    });

    it('signs a transaction via the inner keyring', async () => {
      const { wrapper, inner, accountId } = await createWrapperWithAccount();
      const signedTx = { serialized: '0xdeadbeef' };
      inner.signTransaction.mockResolvedValue(signedTx);

      const txParams: TypedTxData = {
        nonce: '0x00',
        gasPrice: '0x09184e72a000',
        gasLimit: '0x2710',
        to: '0x0000000000000000000000000000000000000001',
        value: '0x1000',
      };

      const result = await wrapper.submitRequest(
        createMockRequest(accountId, EthMethod.SignTransaction, [
          txParams as unknown as Json,
        ]),
      );

      expect(result).toStrictEqual(signedTx);
      expect(inner.signTransaction).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        expect.anything(),
      );
    });

    it('signs an EIP-7702 authorization via the inner keyring', async () => {
      const { wrapper, inner, accountId } = await createWrapperWithAccount();
      inner.signEip7702Authorization.mockResolvedValue('0xsignature');

      const authorization = [
        1,
        '0x0000000000000000000000000000000000000001',
        0,
      ];

      const result = await wrapper.submitRequest(
        createMockRequest(
          accountId,
          EthKeyringMethod.SignEip7702Authorization,
          [authorization as unknown as Json],
        ),
      );

      expect(result).toBe('0xsignature');
      expect(inner.signEip7702Authorization).toHaveBeenCalledWith(
        MOCK_ADDRESS,
        authorization,
      );
    });

    it('rejects methods the account cannot handle', async () => {
      const { wrapper, inner, accountId } = await createWrapperWithAccount();

      await expect(
        wrapper.submitRequest(
          createMockRequest(accountId, EthMethod.Sign, [
            MOCK_ADDRESS,
            '0x68656c6c6f',
          ]),
        ),
      ).rejects.toThrow(
        `Account ${accountId} cannot handle method: ${EthMethod.Sign}`,
      );
      expect(inner.signPersonalMessage).not.toHaveBeenCalled();
    });

    it('rejects unknown methods', async () => {
      const { wrapper, accountId } = await createWrapperWithAccount();

      await expect(
        wrapper.submitRequest(
          createMockRequest(accountId, 'unsupported_method'),
        ),
      ).rejects.toThrow(
        `Account ${accountId} cannot handle method: unsupported_method`,
      );
    });
  });
});
