/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { hashPersonalMessage } from '@ethereumjs/util';
import { bytesToHex } from '@metamask/utils';
import type { Hex, Json } from '@metamask/utils';

import { MPCKeyring } from './mpc-keyring';

const mockCreateKey = jest.fn();
const mockRotateKeyShares = jest.fn();
const mockDklsSetup = jest.fn();
const mockDklsSign = jest.fn();
const mockCreateIdentity = jest.fn();
const mockCreateSession = jest.fn();
const mockCreateScopedSessionId = jest.fn();
const mockThresholdKeyToJson = jest.fn();
const mockThresholdKeyFromJson = jest.fn();
const mockNetworkIdentityToJson = jest.fn();
const mockNetworkIdentityFromJson = jest.fn();
const mockGetNetId = jest.fn();
const mockStartCreateKey = jest.fn();
const mockRegisterClient = jest.fn();
const mockStartSign = jest.fn();
const mockStartRotateKeyShares = jest.fn();
const mockStoreKeyShareBackup = jest.fn();
const mockCheckKeyShareBackupId = jest.fn();
const mockLoadKeyShareBackup = jest.fn();
let lastNetworkManagerOptions: Record<string, unknown> | undefined;

const mockDerivedAddress = '0x1111111111111111111111111111111111111111' as Hex;
const mockSessionNonce =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const mockBackupId =
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const mockTypedDataHash = new Uint8Array([9, 8, 7, 6]);
const mockEthSignature = new Uint8Array(65);
mockEthSignature[64] = 27;
const mockBackupKey = new Uint8Array(32).fill(7);

jest.mock('@metamask/mfa-wallet-cl24-lib', () => {
  class MockCL24DKM {
    createKey(...args: unknown[]) {
      return mockCreateKey(...args);
    }

    rotateKeyShares(...args: unknown[]) {
      return mockRotateKeyShares(...args);
    }
  }

  class MockCL24ThresholdKeySerializer {
    toJson(value: unknown) {
      return mockThresholdKeyToJson(value);
    }

    fromJson(value: unknown) {
      return mockThresholdKeyFromJson(value);
    }
  }

  return {
    secp256k1: {},
    CL24DKM: MockCL24DKM,
    CL24ThresholdKeySerializer: MockCL24ThresholdKeySerializer,
    dealersFromCL24Key: (
      key: { shareIndexes: number[] },
      custodians: string[],
    ) => {
      if (custodians.length !== key.shareIndexes.length) {
        throw new Error('Custodians do not match share indexes');
      }
      return custodians.map((netId, shareIndex) => ({ netId, shareIndex }));
    },
  };
});

jest.mock('@metamask/mfa-wallet-network', () => {
  class MockMfaNetworkManager {
    constructor(opts: Record<string, unknown>) {
      lastNetworkManagerOptions = opts;
    }

    createIdentity(...args: unknown[]) {
      return mockCreateIdentity(...args);
    }

    createSession(...args: unknown[]) {
      return mockCreateSession(...args);
    }
  }

  class MockMfaNetworkIdentitySerializer {
    toJson(value: unknown) {
      return mockNetworkIdentityToJson(value);
    }

    fromJson(value: unknown) {
      return mockNetworkIdentityFromJson(value);
    }
  }

  return {
    MfaNetworkManager: MockMfaNetworkManager,
    MfaNetworkIdentitySerializer: MockMfaNetworkIdentitySerializer,
    createScopedSessionId: (...args: unknown[]) =>
      mockCreateScopedSessionId(...args),
  };
});

jest.mock('@metamask/mfa-wallet-dkls23-lib', () => {
  class MockDkls23TssLib {
    setup(...args: unknown[]) {
      return mockDklsSetup(...args);
    }

    sign(...args: unknown[]) {
      return mockDklsSign(...args);
    }
  }

  return { Dkls23TssLib: MockDkls23TssLib };
});

jest.mock('./cloud', () => ({
  getNetId: (...args: unknown[]) => mockGetNetId(...args),
  createKey: (...args: unknown[]) => mockStartCreateKey(...args),
  registerClient: (...args: unknown[]) => mockRegisterClient(...args),
  sign: (...args: unknown[]) => mockStartSign(...args),
  rotateKeyShares: (...args: unknown[]) => mockStartRotateKeyShares(...args),
  storeKeyShareBackup: (...args: unknown[]) => mockStoreKeyShareBackup(...args),
  checkKeyShareBackupId: (...args: unknown[]) =>
    mockCheckKeyShareBackupId(...args),
  loadKeyShareBackup: (...args: unknown[]) => mockLoadKeyShareBackup(...args),
}));

jest.mock('./util', () => {
  const actual = jest.requireActual('./util');
  return {
    ...actual,
    generateSessionNonce: jest.fn(() => mockSessionNonce),
    createBackupId: jest.fn(() => mockBackupId),
    encryptBytes: jest.fn(async (_key: Uint8Array, plaintext: Uint8Array) => {
      return plaintext;
    }),
    decryptBytes: jest.fn(async (_key: Uint8Array, ciphertext: Uint8Array) => {
      return ciphertext;
    }),
    getSignedTypedDataHash: jest.fn(() => mockTypedDataHash),
    publicKeyToAddressHex: jest.fn(() => mockDerivedAddress),
    toEthSig: jest.fn(() => mockEthSignature),
  };
});

const makeThresholdKey = () => {
  return {
    threshold: 2,
    shareIndex: 0,
    shareIndexes: [1, 2],
    publicKey: new Uint8Array([4, 1, 2, 3]),
    privateKeyShare: new Uint8Array([5, 6, 7]),
    secretPolynomialCommitment: [new Uint8Array([8])],
  };
};

const makeSerializedState = (overrides: Record<string, unknown> = {}) => ({
  netCreds: { partyId: 'local-user' },
  keyShare: makeThresholdKey(),
  serverNetId: 'cloud-user',
  backupId: mockBackupId,
  tssSetup: '0x0102',
  ...overrides,
});

const makeRootSession = () => {
  const session = {
    sendMessage: jest.fn(),
    receiveMessage: jest
      .fn()
      .mockResolvedValue(
        new TextEncoder().encode(JSON.stringify({ haveSetup: true })),
      ),
    createSubsession: jest
      .fn()
      .mockImplementation((label: string) => ({ label })),
    disconnect: jest.fn().mockResolvedValue(undefined),
  };
  return session;
};

const makeKeyring = (
  getProfileToken = jest.fn().mockResolvedValue('token'),
  getBackupEncryptionKey = jest.fn().mockResolvedValue(mockBackupKey),
) =>
  new MPCKeyring({
    getRandomBytes: (size) => new Uint8Array(size).fill(3),
    dkls23Lib: {} as never,
    cloudURL: 'https://cloud.example',
    relayerURL: 'https://relayer.example',
    getProfileToken,
    getBackupEncryptionKey,
  });

const deserializeState = async (
  keyring: MPCKeyring,
  state = makeSerializedState(),
) => {
  await keyring.deserialize(state as unknown as Json);
};

describe('MPCKeyring', () => {
  beforeEach(() => {
    lastNetworkManagerOptions = undefined;

    const mockedUtil = jest.requireMock('./util');

    mockedUtil.generateSessionNonce.mockReturnValue(mockSessionNonce);
    mockedUtil.createBackupId.mockReturnValue(mockBackupId);
    mockedUtil.encryptBytes.mockImplementation(
      async (_key: Uint8Array, plaintext: Uint8Array) => plaintext,
    );
    mockedUtil.decryptBytes.mockImplementation(
      async (_key: Uint8Array, ciphertext: Uint8Array) => ciphertext,
    );
    mockedUtil.getSignedTypedDataHash.mockReturnValue(mockTypedDataHash);
    mockedUtil.publicKeyToAddressHex.mockReturnValue(mockDerivedAddress);
    mockedUtil.toEthSig.mockReturnValue(mockEthSignature);

    mockCreateScopedSessionId.mockImplementation(
      (partyIds: string[], nonce: string) =>
        `session:${partyIds.join('|')}:${nonce}`,
    );
    mockThresholdKeyToJson.mockImplementation((value) => value);
    mockThresholdKeyFromJson.mockImplementation((value) => value);
    mockNetworkIdentityToJson.mockImplementation((value) => value);
    mockNetworkIdentityFromJson.mockImplementation((value) => value);
    mockGetNetId.mockResolvedValue('cloud-user');
    mockStartCreateKey.mockResolvedValue(undefined);
    mockRegisterClient.mockResolvedValue(undefined);
    mockStartSign.mockResolvedValue(undefined);
    mockStartRotateKeyShares.mockResolvedValue(undefined);
    mockStoreKeyShareBackup.mockResolvedValue(undefined);
    mockCheckKeyShareBackupId.mockResolvedValue(mockBackupId);
    mockLoadKeyShareBackup.mockResolvedValue({
      encryptedKeyShare: new TextEncoder().encode(JSON.stringify({ ok: true })),
      backupId: mockBackupId,
    });
    mockDklsSetup.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockDklsSign.mockResolvedValue({ signature: new Uint8Array(64).fill(9) });
  });

  it('exposes the expected type constant', () => {
    const keyring = makeKeyring();
    expect(keyring.type).toBe('MPC Keyring');
  });

  it('wires network manager options and random byte adapter', () => {
    const transportToken = jest.fn().mockResolvedValue('transport-token');
    const webSocket = { send: jest.fn() };
    const randomBytes = jest
      .fn()
      .mockReturnValueOnce(new Uint8Array([1, 2, 3, 4]));

    const keyring = new MPCKeyring({
      getRandomBytes: randomBytes,
      dkls23Lib: {} as never,
      cloudURL: 'https://cloud.example',
      relayerURL: 'https://relayer.example',
      getProfileToken: jest.fn().mockResolvedValue('verifier-token'),
      getBackupEncryptionKey: jest.fn().mockResolvedValue(mockBackupKey),
      getTransportToken: transportToken,
      webSocket,
    });
    expect(keyring.type).toBe('MPC Keyring');

    expect(lastNetworkManagerOptions).toStrictEqual(
      expect.objectContaining({
        url: 'https://relayer.example',
        getToken: transportToken,
        websocket: webSocket,
      }),
    );

    const randomBytesAdapter = lastNetworkManagerOptions?.randomBytes as {
      getRandomValues: (array: Uint8Array) => Uint8Array;
    };
    const output = randomBytesAdapter.getRandomValues(new Uint8Array(4));
    expect(output).toStrictEqual(new Uint8Array([1, 2, 3, 4]));
    expect(randomBytes).toHaveBeenCalledWith(4);
  });

  it('serializes to an empty object before initialization', async () => {
    const keyring = makeKeyring();
    expect(await keyring.serialize()).toStrictEqual({});
    expect(await keyring.getAccounts()).toStrictEqual([]);
  });

  it('deserializes and re-serializes valid state', async () => {
    const keyring = makeKeyring();
    const state = makeSerializedState();

    await deserializeState(keyring, state);

    expect(await keyring.serialize()).toStrictEqual(state);
    expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
  });

  it('round-trips null tssSetup', async () => {
    const keyring = makeKeyring();
    const state = makeSerializedState({ tssSetup: null });
    await deserializeState(keyring, state);
    expect(await keyring.serialize()).toStrictEqual(state);
  });

  it('throws on invalid deserialize input', async () => {
    const keyring = makeKeyring();
    await expect(keyring.deserialize(null as never)).rejects.toThrow(
      'Invalid state',
    );
  });

  it('throws on invalid setup params in deserialize', async () => {
    const keyring = makeKeyring();

    await expect(
      keyring.deserialize({
        mode: 'join',
      } as never),
    ).rejects.toThrow("Invalid setup mode: expected 'create' or 'import'");
  });

  it('does not initialize from incomplete serialized state', async () => {
    const keyring = makeKeyring();
    await keyring.deserialize({ backupId: 'only-backup-id' });
    await expect(keyring.checkKeyShare()).rejects.toThrow(
      'Keyring not initialized',
    );
  });

  it('creates a key via deserialize(init args) + init(create mode)', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    const rootSession = makeRootSession();

    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());

    await keyring.deserialize({ mode: 'create' });
    expect(await keyring.serialize()).toStrictEqual({ mode: 'create' });
    await keyring.init();

    expect(getProfileToken).toHaveBeenCalledWith({ twoFactor: true });
    expect(mockGetNetId).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
    });
    expect(mockStartCreateKey).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      clientNetId: 'local-user',
      nonce: mockSessionNonce,
    });
    expect(mockCreateScopedSessionId).toHaveBeenCalledWith(
      ['cloud-user', 'local-user'],
      mockSessionNonce,
    );
    expect(mockCreateKey).toHaveBeenCalledWith(
      expect.objectContaining({
        custodians: ['local-user', 'cloud-user'],
        threshold: 2,
        networkSession: { label: 'create-key' },
      }),
    );
    expect(mockDklsSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-setup' },
      }),
    );
    expect(rootSession.createSubsession).toHaveBeenCalledWith('create-key');
    expect(rootSession.createSubsession).toHaveBeenCalledWith('tss-setup');
    expect(mockStoreKeyShareBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        backupId: mockBackupId,
      }),
    );
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: makeThresholdKey(),
      serverNetId: 'cloud-user',
      backupId: mockBackupId,
      tssSetup: '0x010203',
    });
  });

  it('imports a key from the backend backup', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'imported-user' });
    mockThresholdKeyFromJson.mockReturnValueOnce(makeThresholdKey());

    await keyring.deserialize({ mode: 'import' });
    expect(await keyring.serialize()).toStrictEqual({ mode: 'import' });
    await keyring.init();

    expect(mockLoadKeyShareBackup).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
    });
    expect(mockRegisterClient).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      clientNetId: 'imported-user',
    });
    expect(mockDklsSetup).not.toHaveBeenCalled();
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'imported-user' },
      keyShare: makeThresholdKey(),
      serverNetId: 'cloud-user',
      backupId: mockBackupId,
      tssSetup: null,
    });
  });

  it('init is a no-op when already initialized', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    expect(await keyring.init()).toBeUndefined();
    expect(mockStartCreateKey).not.toHaveBeenCalled();
    expect(mockLoadKeyShareBackup).not.toHaveBeenCalled();
  });

  it('init is a no-op without setup params or mode', async () => {
    const keyring = makeKeyring();
    expect(await keyring.init()).toBeUndefined();
    expect(mockStartCreateKey).not.toHaveBeenCalled();
  });

  it('init can take create mode without prior deserialize', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession();
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());

    await keyring.init('create');
    expect(mockStartCreateKey).toHaveBeenCalledTimes(1);
    expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
  });

  it('rotates key shares without regenerating tssSetup', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const rotatedKey = {
      ...makeThresholdKey(),
      privateKeyShare: new Uint8Array([9, 9, 9]),
    };
    const newBackupId =
      '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';
    const mockedUtil = jest.requireMock('./util');
    mockedUtil.createBackupId.mockReturnValueOnce(newBackupId);

    const rootSession = makeRootSession();
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockRotateKeyShares.mockResolvedValueOnce(rotatedKey);

    await keyring.rotateKeyShares();

    expect(getProfileToken).toHaveBeenCalledWith({ twoFactor: true });
    expect(mockStartRotateKeyShares).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      clientNetId: 'local-user',
      nonce: mockSessionNonce,
    });
    expect(mockRotateKeyShares).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'rotate-key-shares' },
      }),
    );
    expect(rootSession.createSubsession).toHaveBeenCalledWith(
      'rotate-key-shares',
    );
    expect(mockDklsSetup).not.toHaveBeenCalled();
    expect(mockStoreKeyShareBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        backupId: newBackupId,
        token: 'token',
      }),
    );
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: rotatedKey,
      serverNetId: 'cloud-user',
      backupId: newBackupId,
      tssSetup: '0x0102',
    });
  });

  it('checks whether the local backup id matches the backend', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    expect(await keyring.checkKeyShare()).toBe(true);
    expect(getProfileToken).toHaveBeenCalledWith();
    expect(mockCheckKeyShareBackupId).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
    });

    mockCheckKeyShareBackupId.mockResolvedValueOnce('other-backup-id');
    expect(await keyring.checkKeyShare()).toBe(false);
  });

  it('syncs key share and backup id from the backend', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const syncedKey = {
      ...makeThresholdKey(),
      privateKeyShare: new Uint8Array([1, 1, 1]),
    };
    mockLoadKeyShareBackup.mockResolvedValueOnce({
      encryptedKeyShare: new TextEncoder().encode(JSON.stringify({ ok: true })),
      backupId: 'synced-backup-id',
    });
    mockThresholdKeyFromJson.mockReturnValueOnce(syncedKey);

    await keyring.syncKeyShare();

    expect(getProfileToken).toHaveBeenCalledWith({ twoFactor: true });
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: syncedKey,
      serverNetId: 'cloud-user',
      backupId: 'synced-backup-id',
      tssSetup: '0x0102',
    });
  });

  it('signs personal messages and transactions through the MPC flow', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const signSession = makeRootSession();
    mockCreateSession.mockResolvedValue(signSession);

    const messageHex = '0x68656c6c6f';
    const signatureHex = await keyring.signPersonalMessage(
      mockDerivedAddress,
      messageHex,
    );
    expect(signatureHex).toBe(bytesToHex(mockEthSignature));
    expect(getProfileToken).toHaveBeenCalledWith({
      twoFactor: true,
      challenge: hashPersonalMessage(new TextEncoder().encode('hello')),
    });
    expect(mockStartSign).toHaveBeenCalledWith(
      expect.objectContaining({
        clientNetId: 'local-user',
        token: 'token',
        data: hashPersonalMessage(new TextEncoder().encode('hello')),
      }),
    );
    expect(mockDklsSetup).not.toHaveBeenCalled();
    expect(mockDklsSign).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-sign' },
      }),
    );
    expect(signSession.createSubsession).toHaveBeenCalledWith('tss-sign');
    expect(signSession.createSubsession).not.toHaveBeenCalledWith('tss-setup');

    const tx = {
      getHashedMessageToSign: jest.fn().mockReturnValue(new Uint8Array([1, 2])),
      addSignature: jest.fn().mockReturnValue('signed-tx'),
    };

    expect(await keyring.signTransaction(mockDerivedAddress, tx as never)).toBe(
      'signed-tx',
    );
    expect(tx.addSignature).toHaveBeenCalledWith(
      27n,
      expect.any(Uint8Array),
      expect.any(Uint8Array),
      true,
    );
  });

  it('signs EIP-7702 authorizations through the MPC flow', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const signSession = makeRootSession();
    mockCreateSession.mockResolvedValue(signSession);

    const { hashEIP7702Authorization } = jest.requireActual(
      '@metamask/eth-sig-util',
    );
    const authorization = [
      1,
      '0x1234567890abcdef1234567890abcdef12345678',
      1,
    ] as const;
    const expectedHash = new Uint8Array(
      hashEIP7702Authorization(authorization),
    );

    const signatureHex = await keyring.signEip7702Authorization(
      mockDerivedAddress,
      [...authorization],
    );

    expect(signatureHex).toBe(bytesToHex(mockEthSignature));
    expect(getProfileToken).toHaveBeenCalledWith({
      twoFactor: true,
      challenge: expectedHash,
    });
    expect(mockStartSign).toHaveBeenCalledWith(
      expect.objectContaining({
        clientNetId: 'local-user',
        token: 'token',
        data: expectedHash,
      }),
    );
    expect(mockDklsSign).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expectedHash,
        networkSession: { label: 'tss-sign' },
      }),
    );
  });

  it('runs TSS setup when the peer has discarded setup', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const signSession = makeRootSession();
    signSession.receiveMessage.mockResolvedValueOnce(
      new TextEncoder().encode(JSON.stringify({ haveSetup: false })),
    );
    mockCreateSession.mockResolvedValue(signSession);
    mockDklsSetup.mockResolvedValueOnce(new Uint8Array([9, 9, 9]));

    await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f');

    expect(mockDklsSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-setup' },
      }),
    );
    expect(mockDklsSign).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-sign' },
      }),
    );
    expect(signSession.createSubsession).toHaveBeenCalledWith('tss-setup');
    expect(signSession.createSubsession).toHaveBeenCalledWith('tss-sign');
    expect(await keyring.serialize()).toStrictEqual(
      expect.objectContaining({ tssSetup: '0x090909' }),
    );
  });

  it('runs TSS setup on first sign after import', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring, makeSerializedState({ tssSetup: null }));

    const signSession = makeRootSession();
    mockCreateSession.mockResolvedValue(signSession);

    await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f');
    expect(mockDklsSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-setup' },
      }),
    );
    expect(signSession.createSubsession).toHaveBeenCalledWith('tss-setup');
    expect(signSession.createSubsession).toHaveBeenCalledWith('tss-sign');
  });

  it('discards tssSetup when TSS.sign fails', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const signSession = makeRootSession();
    mockCreateSession.mockResolvedValue(signSession);
    mockDklsSign.mockRejectedValueOnce(new Error('sign failed'));

    await expect(
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).rejects.toThrow('sign failed');

    expect(await keyring.serialize()).toStrictEqual(
      expect.objectContaining({ tssSetup: null }),
    );
  });

  it('serializes concurrent sign calls', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    let inFlight = 0;
    let maxInFlight = 0;
    mockDklsSign.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inFlight -= 1;
      return { signature: new Uint8Array(64).fill(9) };
    });
    mockCreateSession.mockImplementation(async () => makeRootSession());

    await Promise.all([
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ]);

    expect(maxInFlight).toBe(1);
  });

  it('signs typed data and validates signer constraints', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    mockCreateSession.mockResolvedValue(makeRootSession());

    const signature = await keyring.signTypedData(
      mockDerivedAddress,
      [{ type: 'string', name: 'message', value: 'hello' }],
      {},
    );
    expect(signature).toBe(bytesToHex(mockEthSignature));
  });

  it('throws for signing with an unknown account', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    await expect(
      keyring.signPersonalMessage(
        '0x2222222222222222222222222222222222222222',
        '0x68656c6c6f',
      ),
    ).rejects.toThrow(
      'account 0x2222222222222222222222222222222222222222 not found',
    );
  });

  it('throws for unsupported account APIs that are not implemented', async () => {
    const keyring = makeKeyring();

    await expect(keyring.addAccounts()).rejects.toThrow(
      'addAccounts(1): not implemented',
    );
    await expect(keyring.addAccounts(2)).rejects.toThrow(
      'addAccounts(2): not implemented',
    );
    await expect(
      keyring.getAppKeyAddress(mockDerivedAddress, 'example.com'),
    ).rejects.toThrow(
      `getAppKeyAddress(${mockDerivedAddress}, example.com): not implemented`,
    );
  });
});
