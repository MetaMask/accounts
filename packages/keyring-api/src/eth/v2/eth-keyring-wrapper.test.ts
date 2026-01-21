import type { TypedTxData } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

import { EthKeyringMethod, EthKeyringWrapper } from './eth-keyring-wrapper';
import { EthAccountType } from '../../api/account';
import type { KeyringAccount } from '../../api/account';
import type { KeyringRequest } from '../../api/request';
import type { CreateAccountOptions } from '../../api/v2/create-account';
import { KeyringType } from '../../api/v2/keyring-type';
import { EthScope } from '../constants';
import { EthMethod } from '../types';

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as Hex;
const MOCK_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

const TEST_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.Sign,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthKeyringMethod.Decrypt,
  EthKeyringMethod.GetEncryptionPublicKey,
  EthKeyringMethod.GetAppKeyAddress,
  EthKeyringMethod.SignEip7702Authorization,
];

/**
 * Creates a mock Keyring with configurable method implementations.
 * Only implements the required Keyring interface methods.
 *
 * @param overrides - Optional partial Keyring to override default mock implementations.
 * @returns A mock Keyring instance.
 */
function createMockKeyring(overrides: Partial<Keyring> = {}): Keyring {
  return {
    type: 'Mock Keyring',
    getAccounts: jest.fn().mockResolvedValue([MOCK_ADDRESS]),
    addAccounts: jest.fn().mockResolvedValue([]),
    serialize: jest.fn().mockResolvedValue({}),
    deserialize: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Minimal concrete implementation of EthKeyringWrapper for testing.
 * Only implements abstract methods.
 */
class TestEthKeyringWrapper extends EthKeyringWrapper<Keyring> {
  readonly #mockAccount: KeyringAccount = {
    id: MOCK_ACCOUNT_ID,
    type: EthAccountType.Eoa,
    address: MOCK_ADDRESS,
    scopes: [EthScope.Eoa],
    methods: [...TEST_METHODS],
    options: {},
  };

  constructor(inner: Keyring) {
    super({
      type: KeyringType.Hd,
      inner,
      capabilities: { scopes: [EthScope.Eoa] },
    });
    this.registry.register(MOCK_ADDRESS);
    this.registry.set(this.#mockAccount);
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    return [this.#mockAccount];
  }

  async createAccounts(_opts: CreateAccountOptions): Promise<KeyringAccount[]> {
    return [];
  }

  async deleteAccount(_id: string): Promise<void> {
    // noop
  }

  // Expose protected method for testing
  public testToHexAddress(address: string): Hex {
    return this.toHexAddress(address);
  }
}

/**
 * Test wrapper with an extra unsupported method in account.methods.
 * Used to test the default case in submitRequest switch.
 */
class TestEthKeyringWrapperWithUnsupportedMethod extends TestEthKeyringWrapper {
  readonly #mockAccount: KeyringAccount = {
    id: MOCK_ACCOUNT_ID,
    type: EthAccountType.Eoa,
    address: MOCK_ADDRESS,
    scopes: [EthScope.Eoa],
    methods: [...TEST_METHODS, 'eth_unsupported'],
    options: {},
  };

  constructor(inner: Keyring) {
    super(inner);
    this.registry.set(this.#mockAccount);
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    return [this.#mockAccount];
  }
}

/**
 * Creates a mock KeyringRequest for testing.
 *
 * @param method - The RPC method name.
 * @param params - Optional array of parameters.
 * @returns A KeyringRequest object.
 */
function createMockRequest(
  method: string,
  params: Json[] = [],
): KeyringRequest {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    scope: EthScope.Eoa,
    account: MOCK_ACCOUNT_ID,
    origin: 'https://example.com',
    request: { method, params },
  };
}

describe('EthKeyringWrapper', () => {
  describe('toHexAddress', () => {
    it('adds 0x prefix to address without prefix', () => {
      const wrapper = new TestEthKeyringWrapper(createMockKeyring());
      expect(wrapper.testToHexAddress('1234')).toBe('0x1234');
    });

    it('keeps 0x prefix if already present', () => {
      const wrapper = new TestEthKeyringWrapper(createMockKeyring());
      expect(wrapper.testToHexAddress('0x1234')).toBe('0x1234');
    });
  });

  describe('submitRequest', () => {
    describe('eth_signTransaction', () => {
      it('calls inner.signTransaction and returns result', async () => {
        const mockSignTransaction = jest
          .fn()
          .mockResolvedValue({ gasLimit: '0x0' } as TypedTxData);
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signTransaction: mockSignTransaction }),
        );

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.SignTransaction, [{ to: MOCK_ADDRESS }]),
        );

        expect(mockSignTransaction).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          expect.any(Object),
        );
        expect(result).toStrictEqual({ gasLimit: '0x0' });
      });

      it('throws when keyring does not support signTransaction', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.SignTransaction, [
              { to: MOCK_ADDRESS },
            ]),
          ),
        ).rejects.toThrow('Keyring does not support signTransaction');
      });

      it('throws for invalid params', async () => {
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signTransaction: jest.fn() }),
        );

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.SignTransaction, []),
          ),
        ).rejects.toThrow(expect.any(Error));
      });
    });

    describe('eth_sign', () => {
      it('calls inner.signMessage and returns result', async () => {
        const mockSignMessage = jest.fn().mockResolvedValue('0xsig');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signMessage: mockSignMessage }),
        );
        // eth_sign requires 32 bytes (64 hex chars) of data
        const data = `0x${'1234'.repeat(16)}`;

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.Sign, [MOCK_ADDRESS, data]),
        );

        expect(mockSignMessage).toHaveBeenCalledWith(MOCK_ADDRESS, data);
        expect(result).toBe('0xsig');
      });

      it('throws when keyring does not support signMessage', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());
        const data = `0x${'1234'.repeat(16)}`;

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.Sign, [MOCK_ADDRESS, data]),
          ),
        ).rejects.toThrow('Keyring does not support signMessage');
      });
    });

    describe('personal_sign', () => {
      it('calls inner.signPersonalMessage and returns result', async () => {
        const mockSignPersonalMessage = jest.fn().mockResolvedValue('0xsig');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signPersonalMessage: mockSignPersonalMessage }),
        );
        const data = '0x68656c6c6f'; // "hello" in hex

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.PersonalSign, [data]),
        );

        expect(mockSignPersonalMessage).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          data,
        );
        expect(result).toBe('0xsig');
      });

      it('throws when keyring does not support signPersonalMessage', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());
        const data = '0x68656c6c6f';

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.PersonalSign, [data]),
          ),
        ).rejects.toThrow('Keyring does not support signPersonalMessage');
      });
    });

    describe('eth_signTypedData_v1', () => {
      it('calls inner.signTypedData with V1 and returns result', async () => {
        const mockSignTypedData = jest.fn().mockResolvedValue('0xsig');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signTypedData: mockSignTypedData }),
        );
        const typedData = [{ type: 'string', name: 'test', value: 'test' }];

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.SignTypedDataV1, [
            MOCK_ADDRESS,
            typedData,
          ]),
        );

        expect(mockSignTypedData).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          typedData,
          {
            version: SignTypedDataVersion.V1,
          },
        );
        expect(result).toBe('0xsig');
      });

      it('throws when keyring does not support signTypedData', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.SignTypedDataV1, [MOCK_ADDRESS, []]),
          ),
        ).rejects.toThrow('Keyring does not support signTypedData');
      });
    });

    describe('eth_signTypedData_v3', () => {
      it('calls inner.signTypedData with V3 and returns result', async () => {
        const mockSignTypedData = jest.fn().mockResolvedValue('0xsig');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signTypedData: mockSignTypedData }),
        );
        const typedData = {
          types: {},
          domain: {},
          primaryType: 'Test',
          message: {},
        };

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.SignTypedDataV3, [
            MOCK_ADDRESS,
            typedData,
          ]),
        );

        expect(mockSignTypedData).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          typedData,
          { version: SignTypedDataVersion.V3 },
        );
        expect(result).toBe('0xsig');
      });

      it('throws when keyring does not support signTypedData', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.SignTypedDataV3, [MOCK_ADDRESS, {}]),
          ),
        ).rejects.toThrow('Keyring does not support signTypedData');
      });
    });

    describe('eth_signTypedData_v4', () => {
      it('calls inner.signTypedData with V4 and returns result', async () => {
        const mockSignTypedData = jest.fn().mockResolvedValue('0xsig');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ signTypedData: mockSignTypedData }),
        );
        const typedData = {
          types: {},
          domain: {},
          primaryType: 'Test',
          message: {},
        };

        const result = await wrapper.submitRequest(
          createMockRequest(EthMethod.SignTypedDataV4, [
            MOCK_ADDRESS,
            typedData,
          ]),
        );

        expect(mockSignTypedData).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          typedData,
          { version: SignTypedDataVersion.V4 },
        );
        expect(result).toBe('0xsig');
      });

      it('throws when keyring does not support signTypedData', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthMethod.SignTypedDataV4, [MOCK_ADDRESS, {}]),
          ),
        ).rejects.toThrow('Keyring does not support signTypedData');
      });
    });

    describe('eth_decrypt', () => {
      it('calls inner.decryptMessage and returns result', async () => {
        const mockDecryptMessage = jest.fn().mockResolvedValue('decrypted');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ decryptMessage: mockDecryptMessage }),
        );
        const encryptedData = {
          version: 'x25519-xsalsa20-poly1305',
          nonce: 'n',
          ephemPublicKey: 'k',
          ciphertext: 'c',
        };

        const result = await wrapper.submitRequest(
          createMockRequest(EthKeyringMethod.Decrypt, [encryptedData]),
        );

        expect(mockDecryptMessage).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          encryptedData,
        );
        expect(result).toBe('decrypted');
      });

      it('throws when keyring does not support decryptMessage', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthKeyringMethod.Decrypt, [
              {
                version: 'x',
                nonce: 'n',
                ephemPublicKey: 'k',
                ciphertext: 'c',
              },
            ]),
          ),
        ).rejects.toThrow('Keyring does not support decryptMessage');
      });
    });

    describe('eth_getEncryptionPublicKey', () => {
      it('calls inner.getEncryptionPublicKey and returns result', async () => {
        const mockGetEncryptionPublicKey = jest
          .fn()
          .mockResolvedValue('pubkey');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({
            getEncryptionPublicKey: mockGetEncryptionPublicKey,
          }),
        );

        const result = await wrapper.submitRequest(
          createMockRequest(EthKeyringMethod.GetEncryptionPublicKey, [
            MOCK_ADDRESS,
          ]),
        );

        expect(mockGetEncryptionPublicKey).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          undefined,
        );
        expect(result).toBe('pubkey');
      });

      it('throws when keyring does not support getEncryptionPublicKey', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthKeyringMethod.GetEncryptionPublicKey, []),
          ),
        ).rejects.toThrow('Keyring does not support getEncryptionPublicKey');
      });
    });

    describe('eth_getAppKeyAddress', () => {
      it('calls inner.getAppKeyAddress and returns result', async () => {
        const mockGetAppKeyAddress = jest.fn().mockResolvedValue('0xappkey');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({ getAppKeyAddress: mockGetAppKeyAddress }),
        );

        const result = await wrapper.submitRequest(
          createMockRequest(EthKeyringMethod.GetAppKeyAddress, [
            'https://example.com',
          ]),
        );

        expect(mockGetAppKeyAddress).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          'https://example.com',
        );
        expect(result).toBe('0xappkey');
      });

      it('throws when keyring does not support getAppKeyAddress', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthKeyringMethod.GetAppKeyAddress, [
              'https://example.com',
            ]),
          ),
        ).rejects.toThrow('Keyring does not support getAppKeyAddress');
      });
    });

    describe('eth_signEip7702Authorization', () => {
      it('calls inner.signEip7702Authorization and returns result', async () => {
        const mockSignEip7702Authorization = jest
          .fn()
          .mockResolvedValue('0xauth');
        const wrapper = new TestEthKeyringWrapper(
          createMockKeyring({
            signEip7702Authorization: mockSignEip7702Authorization,
          }),
        );
        const authorization = [1, MOCK_ADDRESS, 0];

        const result = await wrapper.submitRequest(
          createMockRequest(EthKeyringMethod.SignEip7702Authorization, [
            authorization,
          ]),
        );

        expect(mockSignEip7702Authorization).toHaveBeenCalledWith(
          MOCK_ADDRESS,
          authorization,
        );
        expect(result).toBe('0xauth');
      });

      it('throws when keyring does not support signEip7702Authorization', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(
            createMockRequest(EthKeyringMethod.SignEip7702Authorization, [
              [1, MOCK_ADDRESS, 0],
            ]),
          ),
        ).rejects.toThrow('Keyring does not support signEip7702Authorization');
      });
    });

    describe('error handling', () => {
      it('throws when account cannot handle the method', async () => {
        const wrapper = new TestEthKeyringWrapper(createMockKeyring());

        await expect(
          wrapper.submitRequest(createMockRequest('unsupported_method', [])),
        ).rejects.toThrow(
          `Account ${MOCK_ACCOUNT_ID} cannot handle method: unsupported_method`,
        );
      });

      it('throws for unrecognized method in switch default case', async () => {
        const wrapper = new TestEthKeyringWrapperWithUnsupportedMethod(
          createMockKeyring(),
        );

        await expect(
          wrapper.submitRequest(createMockRequest('eth_unsupported', [])),
        ).rejects.toThrow(
          'Unsupported method for EthKeyringWrapper: eth_unsupported',
        );
      });
    });
  });

  describe('EthKeyringMethod enum', () => {
    it('has correct values', () => {
      expect(EthKeyringMethod.Decrypt).toBe('eth_decrypt');
      expect(EthKeyringMethod.GetEncryptionPublicKey).toBe(
        'eth_getEncryptionPublicKey',
      );
      expect(EthKeyringMethod.GetAppKeyAddress).toBe('eth_getAppKeyAddress');
      expect(EthKeyringMethod.SignEip7702Authorization).toBe(
        'eth_signEip7702Authorization',
      );
    });
  });
});
