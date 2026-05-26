import type { TypedTransaction, TypedTxData } from '@ethereumjs/tx';
import { TransactionFactory } from '@ethereumjs/tx';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import type {
  EthBaseTransaction,
  EthBaseUserOperation,
  EthUserOperation,
  EthUserOperationPatch,
  KeyringAccount,
  KeyringExecutionContext,
  KeyringRequest,
} from '@metamask/keyring-api';
import {
  AccountExportType,
  KeyringType,
  PrivateKeyEncoding,
} from '@metamask/keyring-api/v2';
import type { Keyring as KeyringV2 } from '@metamask/keyring-api/v2';
import type { Hex, Json } from '@metamask/utils';

import {
  EthKeyringV1AccountNotFoundError,
  EthKeyringV1Adapter,
  EthKeyringV1MethodNotSupportedError,
} from './eth-keyring-v1-adapter';
import { EthKeyringMethod } from './eth-keyring-wrapper';

const ACCOUNT_ADDRESS = '0x660265edc169bab511a40c0e049cc1e33774443d';
const ACCOUNT_ID = 'mock-account-id';
const OTHER_ACCOUNT_ADDRESS = '0x96a3a7898f0072d03cf76c91e8a11da5b03653c8';
const OTHER_ACCOUNT_ID = 'mock-other-account-id';
const UNKNOWN_ACCOUNT_ADDRESS = '0x9c6f1a77f5d6dbecc927bc9f1d5c1f4a10f23df9';
const APP_ORIGIN = 'https://metamask.github.io';
const DEFAULT_ORIGIN = 'metamask';

const ALL_SUPPORTED_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.Sign,
  EthKeyringMethod.SignEip7702Authorization,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  EthMethod.PrepareUserOperation,
  EthMethod.PatchUserOperation,
  EthMethod.SignUserOperation,
];

type ExportAccount = NonNullable<KeyringV2['exportAccount']>;
type ExportAccountMock = jest.Mock<
  ReturnType<ExportAccount>,
  Parameters<ExportAccount>
>;
type SubmitRequest = KeyringV2['submitRequest'];
type SubmitRequestMock = jest.Mock<
  ReturnType<SubmitRequest>,
  Parameters<SubmitRequest>
>;

function setup({
  accounts = [buildAccount()],
  exportedPrivateKey = '0xabc123',
  includeExportAccount = true,
  origin,
  submitRequestResult = 'request-result',
}: {
  accounts?: KeyringAccount[];
  exportedPrivateKey?: string;
  includeExportAccount?: boolean;
  origin?: string;
  submitRequestResult?: Json;
} = {}): {
  accounts: KeyringAccount[];
  adapter: EthKeyringV1Adapter;
  keyring: KeyringV2;
  mocks: {
    exportAccount: ExportAccountMock | undefined;
    submitRequest: SubmitRequestMock;
  };
} {
  const serialize = jest.fn(async () => ({ serialized: true }));
  const deserialize = jest.fn(async () => undefined);
  const getAccounts = jest.fn(async () => accounts);
  const getAccount = jest.fn(async (accountId: string) => {
    const account = accounts.find(({ id }) => id === accountId);

    if (!account) {
      throw new Error(`Account not found: ${accountId}`);
    }

    return account;
  });
  const createAccounts = jest.fn(async () => []);
  const deleteAccount = jest.fn(async () => undefined);
  const submitRequest: SubmitRequestMock = jest.fn(
    async (_request) => submitRequestResult,
  );
  const exportAccount: ExportAccountMock | undefined = includeExportAccount
    ? jest.fn(async (_accountId, _options) => ({
        type: AccountExportType.PrivateKey,
        encoding: PrivateKeyEncoding.Hexadecimal,
        privateKey: exportedPrivateKey,
      }))
    : undefined;
  const keyring: KeyringV2 = {
    type: KeyringType.Hd,
    capabilities: {
      scopes: [EthScope.Eoa],
    },
    serialize,
    deserialize,
    getAccounts,
    getAccount,
    createAccounts,
    deleteAccount,
    submitRequest,
    ...(exportAccount === undefined ? {} : { exportAccount }),
  };
  const adapterOptions =
    origin === undefined ? { keyring } : { keyring, origin };

  return {
    accounts,
    adapter: new EthKeyringV1Adapter(adapterOptions),
    keyring,
    mocks: {
      exportAccount,
      submitRequest,
    },
  };
}

function buildAccount(overrides: Partial<KeyringAccount> = {}): KeyringAccount {
  return {
    id: ACCOUNT_ID,
    type: EthAccountType.Eoa,
    address: ACCOUNT_ADDRESS,
    scopes: [EthScope.Eoa],
    methods: [...ALL_SUPPORTED_METHODS],
    options: {},
    ...overrides,
  };
}

function createTransaction(transactionData: TypedTxData): TypedTransaction {
  return TransactionFactory.fromTxData(transactionData);
}

function createUserOperation(): EthUserOperation {
  return {
    sender: ACCOUNT_ADDRESS,
    nonce: '0x1',
    initCode: '0x',
    callData: '0x1234',
    callGasLimit: '0x1',
    verificationGasLimit: '0x2',
    preVerificationGas: '0x3',
    maxFeePerGas: '0x4',
    maxPriorityFeePerGas: '0x5',
    paymasterAndData: '0x',
    signature: '0x',
  };
}

function createBaseUserOperation(): EthBaseUserOperation {
  return {
    nonce: '0x1',
    initCode: '0x',
    callData: '0x1234',
    gasLimits: {
      callGasLimit: '0x1',
      verificationGasLimit: '0x2',
      preVerificationGas: '0x3',
    },
    dummyPaymasterAndData: '0x',
    dummySignature: '0x',
    bundlerUrl: 'https://bundler.example.com/rpc',
  };
}

async function getThrownError(
  action: () => Promise<unknown>,
): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error('Expected action to throw');
}

function assertInstanceOf<ErrorType extends Error>(
  error: unknown,
  expectedError: new (...args: never[]) => ErrorType,
): asserts error is ErrorType {
  if (!(error instanceof expectedError)) {
    throw new Error(`Expected error to be ${expectedError.name}`);
  }
}

function expectLastSubmitRequest(
  mocks: { submitRequest: SubmitRequestMock },
  {
    account,
    method,
    origin = DEFAULT_ORIGIN,
    params,
    scope = EthScope.Eoa,
  }: {
    account: KeyringAccount;
    method: string;
    origin?: string;
    params: KeyringRequest['request']['params'];
    scope?: string;
  },
): void {
  expect(mocks.submitRequest).toHaveBeenLastCalledWith(
    expect.objectContaining({
      account: account.id,
      origin,
      request: { method, params },
      scope,
    }),
  );
}
describe('EthKeyringV1Adapter', () => {
  it('exposes the base ETH keyring methods', () => {
    const { adapter } = setup({ includeExportAccount: false });

    expect(adapter.exportAccount).toStrictEqual(expect.any(Function));
    expect(adapter.signTransaction).toStrictEqual(expect.any(Function));
    expect(adapter.signMessage).toStrictEqual(expect.any(Function));
    expect(adapter.signEip7702Authorization).toStrictEqual(
      expect.any(Function),
    );
    expect(adapter.signPersonalMessage).toStrictEqual(expect.any(Function));
    expect(adapter.signTypedData).toStrictEqual(expect.any(Function));
    expect(adapter.prepareUserOperation).toStrictEqual(expect.any(Function));
    expect(adapter.patchUserOperation).toStrictEqual(expect.any(Function));
    expect(adapter.signUserOperation).toStrictEqual(expect.any(Function));
    expect(
      (adapter as unknown as { getEncryptionPublicKey?: unknown })
        .getEncryptionPublicKey,
    ).toBeUndefined();
  });

  it('exports a private key through the v2 keyring', async () => {
    const account = buildAccount();
    const { adapter, mocks } = setup({
      accounts: [account],
      exportedPrivateKey: '0xabc123',
    });

    expect(await adapter.exportAccount(ACCOUNT_ADDRESS as Hex)).toBe('abc123');

    expect(mocks.exportAccount).toHaveBeenCalledWith(account.id, {
      type: AccountExportType.PrivateKey,
      encoding: PrivateKeyEncoding.Hexadecimal,
    });
  });

  it('throws a non-typed unsupported export error if the v2 keyring does not support exporting', async () => {
    const { adapter } = setup({ includeExportAccount: false });

    const error = await getThrownError(async () =>
      adapter.exportAccount(ACCOUNT_ADDRESS as Hex),
    );

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(EthKeyringV1AccountNotFoundError);
    expect(error).not.toBeInstanceOf(EthKeyringV1MethodNotSupportedError);
    expect((error as Error).message).toBe(
      'Keyring does not support exportAccount',
    );
  });

  it('throws a typed error if no account matches the requested address', async () => {
    const { adapter, mocks } = setup();

    const error = await getThrownError(async () =>
      adapter.signPersonalMessage(
        UNKNOWN_ACCOUNT_ADDRESS as Hex,
        '0xdeadbeef' as Hex,
      ),
    );

    expect(error).toBeInstanceOf(EthKeyringV1AccountNotFoundError);
    assertInstanceOf(error, EthKeyringV1AccountNotFoundError);
    expect(error.address).toBe(UNKNOWN_ACCOUNT_ADDRESS);
    expect(mocks.submitRequest).not.toHaveBeenCalled();
  });

  it('throws a typed error if the requested address cannot be normalized', async () => {
    const invalidAddress = undefined as unknown as Hex;
    const { adapter, mocks } = setup();

    const error = await getThrownError(async () =>
      adapter.signPersonalMessage(invalidAddress, '0xdeadbeef' as Hex),
    );

    expect(error).toBeInstanceOf(EthKeyringV1AccountNotFoundError);
    assertInstanceOf(error, EthKeyringV1AccountNotFoundError);
    expect(error.address).toBe(invalidAddress);
    expect(mocks.submitRequest).not.toHaveBeenCalled();
  });

  it('throws a typed error if the account does not support the requested method', async () => {
    const { adapter, mocks } = setup({
      accounts: [buildAccount({ methods: [EthMethod.PersonalSign] })],
    });

    const error = await getThrownError(async () =>
      adapter.signTransaction(
        ACCOUNT_ADDRESS as Hex,
        createTransaction({ to: ACCOUNT_ADDRESS }),
      ),
    );

    expect(error).toBeInstanceOf(EthKeyringV1MethodNotSupportedError);
    assertInstanceOf(error, EthKeyringV1MethodNotSupportedError);
    expect(error.address).toBe(ACCOUNT_ADDRESS);
    expect(error.method).toBe(EthMethod.SignTransaction);
    expect(mocks.submitRequest).not.toHaveBeenCalled();
  });

  it('uses one adapter for multiple accounts with different supported methods', async () => {
    const personalSignAccount = buildAccount({
      methods: [EthMethod.PersonalSign],
    });
    const signAccount = buildAccount({
      id: OTHER_ACCOUNT_ID,
      address: OTHER_ACCOUNT_ADDRESS,
      methods: [EthMethod.Sign],
    });
    const { adapter, mocks } = setup({
      accounts: [personalSignAccount, signAccount],
      submitRequestResult: '0x1234',
    });

    expect(
      await adapter.signPersonalMessage(
        ACCOUNT_ADDRESS as Hex,
        '0xdeadbeef' as Hex,
      ),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account: personalSignAccount,
      method: EthMethod.PersonalSign,
      params: ['0xdeadbeef', ACCOUNT_ADDRESS],
      scope: '',
    });

    expect(
      await adapter.signMessage(OTHER_ACCOUNT_ADDRESS as Hex, '0xfeed'),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account: signAccount,
      method: EthMethod.Sign,
      params: [OTHER_ACCOUNT_ADDRESS, '0xfeed'],
      scope: '',
    });
  });

  it('submits a transaction signing request', async () => {
    const transactionData: TypedTxData = {
      data: '0x',
      gasLimit: '0x5208',
      gasPrice: '0x1',
      nonce: '0x0',
      to: OTHER_ACCOUNT_ADDRESS,
      value: '0x1',
      chainId: '0x1',
      type: '0x0',
    };
    const signature = {
      r: '0x0' as Hex,
      s: '0x0' as Hex,
      v: '0x27' as Hex,
    };
    const keyringResponse = {
      ...signature,
      to: ACCOUNT_ADDRESS,
      value: '0x2',
    };
    const transaction = createTransaction(transactionData);
    const submittedTransaction = {
      ...transaction.toJSON(),
      from: ACCOUNT_ADDRESS as Hex,
      type: '0x0' as Hex,
      chainId: '0x1' as Hex,
    };
    const expectedSignedTransaction = TransactionFactory.fromTxData({
      ...submittedTransaction,
      ...signature,
    });
    const { accounts, adapter, mocks } = setup({
      submitRequestResult: keyringResponse,
    });

    expect(
      await adapter.signTransaction(ACCOUNT_ADDRESS as Hex, transaction),
    ).toStrictEqual(expectedSignedTransaction);

    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.SignTransaction,
      params: [submittedTransaction],
      scope: EthScope.Mainnet,
    });
  });

  it('submits ETH signing requests', async () => {
    const { accounts, adapter, mocks } = setup({
      submitRequestResult: '0x1234',
    });
    const authorization: [
      chainId: number,
      contractAddress: Hex,
      nonce: number,
    ] = [1, ACCOUNT_ADDRESS as Hex, 2];
    const account = accounts[0] as KeyringAccount;

    expect(
      await adapter.signMessage(ACCOUNT_ADDRESS as Hex, '0xdeadbeef'),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account,
      method: EthMethod.Sign,
      params: [ACCOUNT_ADDRESS, '0xdeadbeef'],
      scope: '',
    });

    expect(
      await adapter.signEip7702Authorization(
        ACCOUNT_ADDRESS as Hex,
        authorization,
      ),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account,
      method: EthKeyringMethod.SignEip7702Authorization,
      params: [authorization],
    });

    expect(
      await adapter.signPersonalMessage(
        ACCOUNT_ADDRESS as Hex,
        '0xdeadbeef' as Hex,
      ),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account,
      method: EthMethod.PersonalSign,
      params: ['0xdeadbeef', ACCOUNT_ADDRESS],
      scope: '',
    });
  });

  it('uses the default origin and empty scope when submitting signing requests', async () => {
    const account = buildAccount({
      methods: [EthMethod.PersonalSign],
      scopes: [],
    });
    const { adapter, mocks } = setup({
      accounts: [account],
      submitRequestResult: '0x1234',
    });

    await adapter.signPersonalMessage(
      ACCOUNT_ADDRESS as Hex,
      '0xdeadbeef' as Hex,
    );

    expect(mocks.submitRequest).toHaveBeenCalledTimes(1);
    expectLastSubmitRequest(mocks, {
      account,
      method: EthMethod.PersonalSign,
      params: ['0xdeadbeef', ACCOUNT_ADDRESS],
      scope: '',
    });
  });

  it('uses the configured origin when submitting requests', async () => {
    const { accounts, adapter, mocks } = setup({
      origin: APP_ORIGIN,
      submitRequestResult: '0x1234',
    });

    await adapter.signPersonalMessage(
      ACCOUNT_ADDRESS as Hex,
      '0xdeadbeef' as Hex,
    );

    expect(mocks.submitRequest).toHaveBeenCalledTimes(1);
    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.PersonalSign,
      origin: APP_ORIGIN,
      params: ['0xdeadbeef', ACCOUNT_ADDRESS],
      scope: '',
    });
  });

  it.each([
    ['without options', undefined, EthMethod.SignTypedDataV1],
    ['with V1', SignTypedDataVersion.V1, EthMethod.SignTypedDataV1],
    ['with V3', SignTypedDataVersion.V3, EthMethod.SignTypedDataV3],
    ['with V4', SignTypedDataVersion.V4, EthMethod.SignTypedDataV4],
  ])(
    'submits a typed data signing request %s',
    async (_label, version, method) => {
      const typedData = { message: 'hello', ignored: undefined };
      const submittedTypedData = { message: 'hello' };
      const { accounts, adapter, mocks } = setup({
        submitRequestResult: '0x1234',
      });

      expect(
        await adapter.signTypedData(
          ACCOUNT_ADDRESS as Hex,
          typedData,
          version === undefined ? undefined : { version },
        ),
      ).toBe('0x1234');
      expectLastSubmitRequest(mocks, {
        account: accounts[0] as KeyringAccount,
        method,
        params: [ACCOUNT_ADDRESS, submittedTypedData],
        scope: '',
      });
    },
  );

  it('uses the typed data domain chain ID as the signing scope', async () => {
    const typedData = {
      domain: {
        chainId: 1,
      },
      message: 'hello',
    };
    const { accounts, adapter, mocks } = setup({
      submitRequestResult: '0x1234',
    });

    expect(
      await adapter.signTypedData(ACCOUNT_ADDRESS as Hex, typedData, {
        version: SignTypedDataVersion.V4,
      }),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.SignTypedDataV4,
      params: [ACCOUNT_ADDRESS, typedData],
      scope: EthScope.Mainnet,
    });
  });

  it('throws a typed error if the requested typed data version is not supported by the account', async () => {
    const { adapter, mocks } = setup({
      accounts: [buildAccount({ methods: [EthMethod.SignTypedDataV1] })],
    });

    const error = await getThrownError(async () =>
      adapter.signTypedData(
        ACCOUNT_ADDRESS as Hex,
        { message: 'hello' },
        { version: SignTypedDataVersion.V4 },
      ),
    );

    expect(error).toBeInstanceOf(EthKeyringV1MethodNotSupportedError);
    assertInstanceOf(error, EthKeyringV1MethodNotSupportedError);
    expect(error.address).toBe(ACCOUNT_ADDRESS);
    expect(error.method).toBe(EthMethod.SignTypedDataV4);
    expect(mocks.submitRequest).not.toHaveBeenCalled();
  });

  it('throws if an ETH signing response is invalid', async () => {
    const { adapter, mocks } = setup();

    mocks.submitRequest.mockResolvedValueOnce('not-hex');

    await expect(
      adapter.signMessage(ACCOUNT_ADDRESS as Hex, '0xdeadbeef'),
    ).rejects.toThrow('Expected a value of type');
  });

  it('submits a user operation preparation request', async () => {
    const { accounts, adapter, mocks } = setup();
    const transactions: EthBaseTransaction[] = [
      {
        to: OTHER_ACCOUNT_ADDRESS,
        value: '0x0',
        data: '0x',
      },
      {
        to: ACCOUNT_ADDRESS,
        value: '0x1',
        data: '0x1234',
      },
    ];
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };
    const baseUserOperation = createBaseUserOperation();

    mocks.submitRequest.mockResolvedValueOnce(
      baseUserOperation as unknown as Json,
    );
    expect(
      await adapter.prepareUserOperation(
        ACCOUNT_ADDRESS,
        transactions,
        executionContext,
      ),
    ).toBe(baseUserOperation);
    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.PrepareUserOperation,
      params: transactions,
      scope: 'eip155:0x1',
    });
  });

  it('submits a user operation patch request', async () => {
    const { accounts, adapter, mocks } = setup();
    const userOperation = {
      ...createUserOperation(),
      ignored: undefined,
    };
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };
    const patch: EthUserOperationPatch = {
      paymasterAndData: '0x1234',
      callGasLimit: '0x1',
    };

    mocks.submitRequest.mockResolvedValueOnce(patch as unknown as Json);
    expect(
      await adapter.patchUserOperation(
        ACCOUNT_ADDRESS,
        userOperation,
        executionContext,
      ),
    ).toBe(patch);
    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.PatchUserOperation,
      params: [createUserOperation()],
      scope: 'eip155:0x1',
    });
  });

  it('submits a user operation signing request', async () => {
    const { accounts, adapter, mocks } = setup();
    const userOperation = createUserOperation();
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };

    mocks.submitRequest.mockResolvedValueOnce('0x1234');
    expect(
      await adapter.signUserOperation(
        ACCOUNT_ADDRESS,
        userOperation,
        executionContext,
      ),
    ).toBe('0x1234');
    expectLastSubmitRequest(mocks, {
      account: accounts[0] as KeyringAccount,
      method: EthMethod.SignUserOperation,
      params: [userOperation],
      scope: 'eip155:0x1',
    });
  });

  it('throws if a user operation preparation response is invalid', async () => {
    const { adapter, mocks } = setup();
    const transactions: EthBaseTransaction[] = [];
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };

    mocks.submitRequest.mockResolvedValueOnce({
      ...createBaseUserOperation(),
      extra: '0x',
    } as unknown as Json);

    await expect(
      adapter.prepareUserOperation(
        ACCOUNT_ADDRESS,
        transactions,
        executionContext,
      ),
    ).rejects.toThrow('Expected a value of type');
  });

  it('throws if a user operation patch response is invalid', async () => {
    const { adapter, mocks } = setup();
    const userOperation = createUserOperation();
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };

    mocks.submitRequest.mockResolvedValueOnce({
      paymasterAndData: '0x1234',
      extra: '0x',
    } as unknown as Json);

    await expect(
      adapter.patchUserOperation(
        ACCOUNT_ADDRESS,
        userOperation,
        executionContext,
      ),
    ).rejects.toThrow('Expected a value of type');
  });

  it('throws if a user operation signing response is invalid', async () => {
    const { adapter, mocks } = setup();
    const userOperation = createUserOperation();
    const executionContext: KeyringExecutionContext = { chainId: '0x1' };

    mocks.submitRequest.mockResolvedValueOnce('not-hex');

    await expect(
      adapter.signUserOperation(
        ACCOUNT_ADDRESS,
        userOperation,
        executionContext,
      ),
    ).rejects.toThrow('Expected a value of type');
  });
});
