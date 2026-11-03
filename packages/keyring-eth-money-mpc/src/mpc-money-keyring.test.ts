/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { hashPersonalMessage } from '@ethereumjs/util';
import type { MoneyAccountSignatureRequest } from '@metamask/money-account-mfa-whitelist';
import { bytesToHex } from '@metamask/utils';
import type { Hex, Json } from '@metamask/utils';

import { MpcMoneyKeyring } from './mpc-money-keyring.js';
import { MFA_REQUIRED_CODE } from './types.js';

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
const mockCheckKeyShare = jest.fn();
const mockSetActiveEpoch = jest.fn();
const mockLoadKeyShareBackup = jest.fn();
let lastNetworkManagerOptions: Record<string, unknown> | undefined;

const mockDerivedAddress = '0x1111111111111111111111111111111111111111' as Hex;
const mockSessionNonce =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const mockShareEpoch = 1;
const mockTypedDataHash = new Uint8Array([9, 8, 7, 6]);
const mockEthSignature = new Uint8Array(65);
mockEthSignature[64] = 27;
const mockBackupKey = new Uint8Array(32).fill(7);

jest.mock('@metamask/mfa-wallet-cl24', () => {
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
    CL24DKM: MockCL24DKM,
    CL24ThresholdKeySerializer: MockCL24ThresholdKeySerializer,
  };
});

jest.mock('@metamask/mfa-wallet-network', () => {
  class MockCentrifugeNetworkManager {
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

  class MockCentrifugeIdentitySerializer {
    toJson(value: unknown) {
      return mockNetworkIdentityToJson(value);
    }

    fromJson(value: unknown) {
      return mockNetworkIdentityFromJson(value);
    }
  }

  return {
    CentrifugeNetworkManager: MockCentrifugeNetworkManager,
    CentrifugeIdentitySerializer: MockCentrifugeIdentitySerializer,
    createScopedSessionId: (...args: unknown[]) =>
      mockCreateScopedSessionId(...args),
  };
});

jest.mock('@metamask/mfa-wallet-dkls23', () => {
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
  checkKeyShare: (...args: unknown[]) => mockCheckKeyShare(...args),
  setActiveEpoch: (...args: unknown[]) => mockSetActiveEpoch(...args),
  loadKeyShareBackup: (...args: unknown[]) => mockLoadKeyShareBackup(...args),
}));

jest.mock('./util', () => {
  const actual = jest.requireActual('./util');
  return {
    ...actual,
    generateSessionNonce: jest.fn(() => mockSessionNonce),
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
    publicKey: new Uint8Array([4, 1, 2, 3]),
    privateKeyShare: new Uint8Array([5, 6, 7]),
    coefficientCommitments: [new Uint8Array([4, 1, 2, 3]), new Uint8Array([8])],
    xCoordinates: [1, 2],
  };
};

const makeSerializedState = (overrides: Record<string, unknown> = {}) => ({
  netCreds: { partyId: 'local-user' },
  keyShare: makeThresholdKey(),
  serverNetId: 'cloud-user',
  shareEpoch: mockShareEpoch,
  tssSetup: '0x0102',
  ...overrides,
});

const encodeText = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

const makeRootSession = (statusPayload = 'data persisted') => {
  const session = {
    sendMessage: jest.fn(),
    receiveMessage: jest
      .fn()
      .mockImplementation(async (_peer: string, type: string) => {
        if (type === 'status') {
          return Promise.resolve(encodeText(statusPayload));
        }
        return Promise.resolve(encodeText(JSON.stringify({ haveSetup: true })));
      }),
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
  isMfaRequired?: (
    request: MoneyAccountSignatureRequest,
    context: { address: Hex; hash: Hex },
  ) => Promise<boolean>,
) =>
  new MpcMoneyKeyring({
    cl24Lib: {} as never,
    dkls23Lib: {} as never,
    cloudURL: 'https://cloud.example',
    relayerURL: 'https://relayer.example',
    getProfileToken,
    getBackupEncryptionKey,
    ...(isMfaRequired === undefined ? {} : { isMfaRequired }),
  });

const deserializeState = async (
  keyring: MpcMoneyKeyring,
  state = makeSerializedState(),
) => {
  await keyring.deserialize(state as unknown as Json);
};

describe('MpcMoneyKeyring', () => {
  beforeEach(() => {
    lastNetworkManagerOptions = undefined;

    const mockedUtil = jest.requireMock('./util');

    mockedUtil.generateSessionNonce.mockReturnValue(mockSessionNonce);
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
    mockStartSign.mockResolvedValue('ok');
    mockStartRotateKeyShares.mockResolvedValue(undefined);
    mockStoreKeyShareBackup.mockResolvedValue(undefined);
    mockCheckKeyShare.mockResolvedValue({
      latestShareEpoch: mockShareEpoch,
      latestBackupEpoch: mockShareEpoch,
      activeEpoch: mockShareEpoch,
    });
    mockSetActiveEpoch.mockResolvedValue(undefined);
    mockLoadKeyShareBackup.mockResolvedValue({
      encryptedKeyShare: new TextEncoder().encode(JSON.stringify({ ok: true })),
      epoch: mockShareEpoch,
    });
    mockDklsSetup.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockDklsSign.mockResolvedValue({ signature: new Uint8Array(64).fill(9) });
  });

  it('exposes the expected type constant', () => {
    const keyring = makeKeyring();
    expect(MpcMoneyKeyring.type).toBe('MPC Money Keyring');
    expect(keyring.type).toBe('MPC Money Keyring');
  });

  it('wires network manager options', () => {
    const transportToken = jest.fn().mockResolvedValue('transport-token');
    const webSocket = { send: jest.fn() };

    const keyring = new MpcMoneyKeyring({
      cl24Lib: {} as never,
      dkls23Lib: {} as never,
      cloudURL: 'https://cloud.example',
      relayerURL: 'https://relayer.example',
      getProfileToken: jest.fn().mockResolvedValue('verifier-token'),
      getBackupEncryptionKey: jest.fn().mockResolvedValue(mockBackupKey),
      getTransportToken: transportToken,
      webSocket,
    });
    expect(keyring.type).toBe('MPC Money Keyring');

    expect(lastNetworkManagerOptions).toStrictEqual(
      expect.objectContaining({
        url: 'https://relayer.example',
        getToken: transportToken,
        websocket: webSocket,
      }),
    );
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

  it('throws on invalid initialized state', async () => {
    const keyring = makeKeyring();

    await expect(
      keyring.deserialize(makeSerializedState({ shareEpoch: 0 }) as never),
    ).rejects.toThrow('Invalid state');
  });

  it('throws on invalid initialized state that also includes a setup mode', async () => {
    const keyring = makeKeyring();

    await expect(
      keyring.deserialize(
        makeSerializedState({ shareEpoch: 0, mode: 'create' }) as never,
      ),
    ).rejects.toThrow('Invalid state');
  });

  it('leaves the keyring fresh when deserializing setup params', async () => {
    const keyring = makeKeyring();

    await keyring.deserialize({ mode: 'create' } as never);

    expect(await keyring.serialize()).toStrictEqual({});
    expect(await keyring.getAccounts()).toStrictEqual([]);
    expect(mockCheckKeyShare).not.toHaveBeenCalled();
  });

  it('does not initialize from incomplete serialized state', async () => {
    const keyring = makeKeyring();
    await keyring.deserialize({ shareEpoch: 1 });
    await expect(keyring.checkKeyShare()).rejects.toThrow(
      'Keyring not initialized',
    );
  });

  it('creates a key via setup when the backend has no key state', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    const rootSession = makeRootSession();

    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());
    // The first query is the mode inference: no key state for the profile.
    mockCheckKeyShare
      .mockResolvedValueOnce({
        latestShareEpoch: undefined,
        latestBackupEpoch: undefined,
        activeEpoch: undefined,
      })
      // The second query is the create-path epoch check.
      .mockResolvedValueOnce({
        latestShareEpoch: mockShareEpoch,
        latestBackupEpoch: mockShareEpoch,
        activeEpoch: mockShareEpoch,
      });

    await keyring.setup();

    expect(getProfileToken).toHaveBeenCalledWith();
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
        custodians: [
          { netId: 'local-user', shareIndex: 0 },
          { netId: 'cloud-user', shareIndex: 1 },
        ],
        threshold: 2,
        networkSession: { label: 'dkg-create' },
      }),
    );
    expect(mockDklsSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        networkSession: { label: 'tss-setup' },
      }),
    );
    expect(rootSession.createSubsession).toHaveBeenCalledWith('dkg-create');
    expect(rootSession.createSubsession).toHaveBeenCalledWith('tss-setup');
    expect(rootSession.receiveMessage).toHaveBeenCalledWith(
      'cloud-user',
      'status',
    );
    expect(rootSession.disconnect).toHaveBeenCalled();
    expect(mockStoreKeyShareBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        epoch: 1,
        attemptNonce: mockSessionNonce,
      }),
    );
    expect(mockCheckKeyShare).toHaveBeenCalledTimes(2);
    expect(mockCheckKeyShare).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
    });
    expect(mockLoadKeyShareBackup).not.toHaveBeenCalled();
    expect(mockSetActiveEpoch).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      epoch: 1,
    });
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: makeThresholdKey(),
      serverNetId: 'cloud-user',
      shareEpoch: 1,
      tssSetup: '0x010203',
    });
  });

  it('throws when create cannot activate an incomplete epoch', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession();
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());
    mockCheckKeyShare
      // The first query is the mode inference: no key state for the profile.
      .mockResolvedValueOnce({
        latestShareEpoch: undefined,
        latestBackupEpoch: undefined,
        activeEpoch: undefined,
      })
      // The second query is the create-path epoch check: not ready.
      .mockResolvedValueOnce({
        latestShareEpoch: 1,
        latestBackupEpoch: undefined,
        activeEpoch: undefined,
      });

    await expect(keyring.setup()).rejects.toThrow('Share epoch 1 is not ready');
    expect(mockSetActiveEpoch).not.toHaveBeenCalled();
    expect(await keyring.serialize()).toStrictEqual({});
  });

  it('creates a key when the backend has only a pending share or backup', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession();
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());
    mockCheckKeyShare
      .mockResolvedValueOnce({
        latestShareEpoch: 1,
        latestBackupEpoch: 1,
        activeEpoch: undefined,
      })
      .mockResolvedValueOnce({
        latestShareEpoch: mockShareEpoch,
        latestBackupEpoch: mockShareEpoch,
        activeEpoch: mockShareEpoch,
      });

    await keyring.setup();

    expect(mockLoadKeyShareBackup).not.toHaveBeenCalled();
    expect(mockStartCreateKey).toHaveBeenCalledTimes(1);
    expect(mockSetActiveEpoch).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      epoch: 1,
    });
  });

  it('imports a key from the backend backup when the backend has key state', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'imported-user' });
    mockThresholdKeyFromJson.mockReturnValueOnce(makeThresholdKey());
    mockCheckKeyShare.mockResolvedValueOnce({
      latestShareEpoch: mockShareEpoch,
      latestBackupEpoch: mockShareEpoch,
      activeEpoch: mockShareEpoch,
    });

    await keyring.setup();

    expect(mockCheckKeyShare).toHaveBeenCalledTimes(1);
    expect(mockStartCreateKey).not.toHaveBeenCalled();
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
    expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'imported-user' },
      keyShare: makeThresholdKey(),
      serverNetId: 'cloud-user',
      shareEpoch: mockShareEpoch,
      tssSetup: null,
    });
  });

  it('setup is a no-op when already initialized', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    expect(await keyring.setup()).toBeUndefined();
    expect(mockCheckKeyShare).not.toHaveBeenCalled();
    expect(mockStartCreateKey).not.toHaveBeenCalled();
    expect(mockLoadKeyShareBackup).not.toHaveBeenCalled();
  });

  it('runs setup once when called concurrently', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession();
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());
    mockCheckKeyShare
      // The first query is the mode inference: no key state for the profile.
      .mockResolvedValueOnce({
        latestShareEpoch: undefined,
        latestBackupEpoch: undefined,
        activeEpoch: undefined,
      })
      // The second query is the create-path epoch check.
      .mockResolvedValueOnce({
        latestShareEpoch: mockShareEpoch,
        latestBackupEpoch: mockShareEpoch,
        activeEpoch: mockShareEpoch,
      });

    await Promise.all([keyring.setup(), keyring.setup()]);

    // Only the first call runs: one inference query plus one epoch check.
    expect(mockCheckKeyShare).toHaveBeenCalledTimes(2);
    expect(mockCreateIdentity).toHaveBeenCalledTimes(1);
    expect(mockStartCreateKey).toHaveBeenCalledTimes(1);
    expect(mockCreateKey).toHaveBeenCalledTimes(1);
    expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
  });

  it('throws when create status is not data persisted', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession();
    rootSession.receiveMessage.mockImplementation(
      async (_peer: string, type: string) => {
        if (type === 'status') {
          return encodeText('running');
        }
        return encodeText(JSON.stringify({ haveSetup: true }));
      },
    );
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());
    // The first query is the mode inference: no key state for the profile.
    mockCheckKeyShare.mockResolvedValueOnce({
      latestShareEpoch: undefined,
      latestBackupEpoch: undefined,
      activeEpoch: undefined,
    });

    await expect(keyring.setup()).rejects.toThrow(
      'Expected status data persisted, received running',
    );
    expect(mockStoreKeyShareBackup).not.toHaveBeenCalled();
  });

  it('rotates key shares, activates the next epoch, and clears tssSetup', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const rotatedKey = {
      ...makeThresholdKey(),
      privateKeyShare: new Uint8Array([9, 9, 9]),
    };

    const rootSession = makeRootSession();
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockRotateKeyShares.mockResolvedValueOnce(rotatedKey);
    mockCheckKeyShare.mockResolvedValueOnce({
      latestShareEpoch: 2,
      latestBackupEpoch: 2,
      activeEpoch: 1,
    });

    await keyring.rotateKeyShares();

    expect(getProfileToken).toHaveBeenCalledWith({ twoFactor: true });
    expect(mockStartRotateKeyShares).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      clientNetId: 'local-user',
      nonce: mockSessionNonce,
      expectedActiveEpoch: 1,
    });
    expect(mockRotateKeyShares).toHaveBeenCalledWith({
      key: makeThresholdKey(),
      custodians: [
        { netId: 'local-user', shareIndex: 0 },
        { netId: 'cloud-user', shareIndex: 1 },
      ],
      networkSession: { label: 'dkg-rotate' },
    });
    expect(rootSession.createSubsession).toHaveBeenCalledWith('dkg-rotate');
    expect(rootSession.receiveMessage).toHaveBeenCalledWith(
      'cloud-user',
      'status',
    );
    expect(rootSession.disconnect).toHaveBeenCalled();
    expect(mockDklsSetup).not.toHaveBeenCalled();
    expect(mockStoreKeyShareBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        epoch: 2,
        token: 'token',
        attemptNonce: mockSessionNonce,
      }),
    );
    expect(mockSetActiveEpoch).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
      epoch: 2,
    });
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: rotatedKey,
      serverNetId: 'cloud-user',
      shareEpoch: 2,
      tssSetup: null,
    });
  });

  it('checks whether local and backend epochs match', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    expect(await keyring.checkKeyShare()).toBe(true);
    expect(getProfileToken).toHaveBeenCalledWith();
    expect(mockCheckKeyShare).toHaveBeenCalledWith({
      baseURL: 'https://cloud.example',
      token: 'token',
    });

    mockCheckKeyShare.mockResolvedValueOnce({
      latestShareEpoch: 2,
      latestBackupEpoch: 1,
      activeEpoch: 1,
    });
    expect(await keyring.checkKeyShare()).toBe(false);
  });

  it('syncs key share and epoch from the backend and clears tssSetup', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const syncedKey = {
      ...makeThresholdKey(),
      privateKeyShare: new Uint8Array([1, 1, 1]),
    };
    mockLoadKeyShareBackup.mockResolvedValueOnce({
      encryptedKeyShare: new TextEncoder().encode(JSON.stringify({ ok: true })),
      epoch: 3,
    });
    mockThresholdKeyFromJson.mockReturnValueOnce(syncedKey);

    await keyring.syncKeyShare();

    expect(getProfileToken).toHaveBeenCalledWith({ twoFactor: true });
    expect(await keyring.serialize()).toStrictEqual({
      netCreds: { partyId: 'local-user' },
      keyShare: syncedKey,
      serverNetId: 'cloud-user',
      shareEpoch: 3,
      tssSetup: null,
    });
  });

  it('signs personal messages through the MPC flow', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const signSession = makeRootSession('signing completed');
    mockCreateSession.mockResolvedValue(signSession);

    const messageHex = '0x68656c6c6f';
    const signatureHex = await keyring.signPersonalMessage(
      mockDerivedAddress,
      messageHex,
    );
    expect(signatureHex).toBe(bytesToHex(mockEthSignature));
    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    expect(getProfileToken).toHaveBeenCalledWith({
      twoFactor: true,
      challenge: messageHash,
    });
    expect(mockStartSign).toHaveBeenCalledWith(
      expect.objectContaining({
        clientNetId: 'local-user',
        token: 'token',
        data: messageHash,
        shareEpoch: 1,
        request: {
          method: 'signPersonalMessage',
          address: mockDerivedAddress,
          message: messageHex,
        },
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
    expect(signSession.receiveMessage).toHaveBeenCalledWith(
      'cloud-user',
      'status',
    );
  });

  it('returns the signature when sign status is not signing completed', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const signSession = makeRootSession();
    signSession.receiveMessage.mockImplementation(
      async (_peer: string, type: string) => {
        if (type === 'status') {
          return encodeText('running');
        }
        return encodeText(JSON.stringify({ haveSetup: true }));
      },
    );
    mockCreateSession.mockResolvedValue(signSession);

    const signatureHex = await keyring.signPersonalMessage(
      mockDerivedAddress,
      '0x68656c6c6f',
    );

    expect(signatureHex).toBe(bytesToHex(mockEthSignature));
    expect(signSession.disconnect).toHaveBeenCalled();
    expect(await keyring.serialize()).toStrictEqual(
      expect.objectContaining({ tssSetup: '0x0102' }),
    );
  });

  it('signs EIP-7702 authorizations through the MPC flow', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);

    const signSession = makeRootSession('signing completed');
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
        shareEpoch: 1,
        request: {
          method: 'signEip7702Authorization',
          address: mockDerivedAddress,
          authorization,
        },
      }),
    );
    expect(mockDklsSign).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expectedHash,
        networkSession: { label: 'tss-sign' },
      }),
    );
  });

  it('skips MFA when the client allows the signature', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const isMfaRequired = jest.fn().mockResolvedValue(false);
    const keyring = makeKeyring(getProfileToken, undefined, isMfaRequired);
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

    const messageHex = '0x68656c6c6f';
    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    expect(
      await keyring.signPersonalMessage(mockDerivedAddress, messageHex),
    ).toBe(bytesToHex(mockEthSignature));

    expect(isMfaRequired).toHaveBeenCalledWith(
      {
        method: 'signPersonalMessage',
        address: mockDerivedAddress,
        message: messageHex,
      },
      {
        address: mockDerivedAddress,
        hash: bytesToHex(messageHash),
      },
    );
    expect(getProfileToken).toHaveBeenCalledTimes(1);
    expect(getProfileToken).toHaveBeenCalledWith();
    expect(mockStartSign).toHaveBeenCalledTimes(1);
    expect(mockStartSign).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token',
        request: {
          method: 'signPersonalMessage',
          address: mockDerivedAddress,
          message: messageHex,
        },
      }),
    );
  });

  it('signs a plain-text personal message as UTF-8', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const isMfaRequired = jest.fn().mockResolvedValue(false);
    const keyring = makeKeyring(getProfileToken, undefined, isMfaRequired);
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    expect(await keyring.signPersonalMessage(mockDerivedAddress, 'hello')).toBe(
      bytesToHex(mockEthSignature),
    );

    expect(isMfaRequired).toHaveBeenCalledWith(
      {
        method: 'signPersonalMessage',
        address: mockDerivedAddress,
        message: '0x68656c6c6f',
      },
      {
        address: mockDerivedAddress,
        hash: bytesToHex(messageHash),
      },
    );
  });

  it('signs an empty 0x personal message as empty hex', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const isMfaRequired = jest.fn().mockResolvedValue(false);
    const keyring = makeKeyring(getProfileToken, undefined, isMfaRequired);
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

    const messageHash = hashPersonalMessage(new Uint8Array());
    expect(await keyring.signPersonalMessage(mockDerivedAddress, '0x')).toBe(
      bytesToHex(mockEthSignature),
    );

    expect(isMfaRequired).toHaveBeenCalledWith(
      {
        method: 'signPersonalMessage',
        address: mockDerivedAddress,
        message: '0x',
      },
      {
        address: mockDerivedAddress,
        hash: bytesToHex(messageHash),
      },
    );
  });

  it('prompts for MFA when the backend returns mfa_required', async () => {
    const getProfileToken = jest
      .fn()
      .mockResolvedValueOnce('session-token')
      .mockResolvedValueOnce('mfa-token');
    const keyring = makeKeyring(
      getProfileToken,
      undefined,
      jest.fn().mockResolvedValue(false),
    );
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));
    mockStartSign
      .mockResolvedValueOnce(MFA_REQUIRED_CODE)
      .mockResolvedValueOnce('ok');
    const mockedUtil = jest.requireMock('./util');
    mockedUtil.generateSessionNonce
      .mockReturnValueOnce('0x1111')
      .mockReturnValueOnce('0x2222');

    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    expect(
      await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).toBe(bytesToHex(mockEthSignature));

    expect(getProfileToken).toHaveBeenNthCalledWith(1);
    expect(getProfileToken).toHaveBeenNthCalledWith(2, {
      twoFactor: true,
      challenge: messageHash,
    });
    expect(mockStartSign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        token: 'session-token',
        nonce: '0x1111',
        request: expect.objectContaining({ method: 'signPersonalMessage' }),
      }),
    );
    expect(mockStartSign).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        request: expect.anything(),
      }),
    );
    expect(mockStartSign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        token: 'mfa-token',
        nonce: '0x2222',
      }),
    );
    expect(mockCreateSession).toHaveBeenCalledWith(
      expect.anything(),
      'session:cloud-user|local-user:0x2222',
    );
  });

  it('requires MFA when the client requires it', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const isMfaRequired = jest.fn().mockResolvedValue(true);
    const keyring = makeKeyring(getProfileToken, undefined, isMfaRequired);
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f');

    expect(isMfaRequired).toHaveBeenCalledWith(
      {
        method: 'signPersonalMessage',
        address: mockDerivedAddress,
        message: '0x68656c6c6f',
      },
      {
        address: mockDerivedAddress,
        hash: bytesToHex(messageHash),
      },
    );
    expect(getProfileToken).toHaveBeenCalledWith({
      twoFactor: true,
      challenge: messageHash,
    });
  });

  it('requires MFA when the client check throws', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(
      getProfileToken,
      undefined,
      jest.fn().mockRejectedValue(new Error('mfa check failed')),
    );
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

    await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f');

    expect(getProfileToken).toHaveBeenCalledWith({
      twoFactor: true,
      challenge: hashPersonalMessage(new TextEncoder().encode('hello')),
    });
  });

  it('retries with a fresh 2FA token when the backend requires MFA for a 2FA token', async () => {
    const getProfileToken = jest
      .fn()
      .mockResolvedValueOnce('session-token')
      .mockResolvedValueOnce('mfa-token');
    const keyring = makeKeyring(getProfileToken);
    await deserializeState(keyring);
    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));
    mockStartSign
      .mockResolvedValueOnce(MFA_REQUIRED_CODE)
      .mockResolvedValueOnce('ok');

    const messageHash = hashPersonalMessage(new TextEncoder().encode('hello'));
    expect(
      await keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).toBe(bytesToHex(mockEthSignature));

    expect(getProfileToken).toHaveBeenNthCalledWith(1, {
      twoFactor: true,
      challenge: messageHash,
    });
    expect(getProfileToken).toHaveBeenNthCalledWith(2, {
      twoFactor: true,
      challenge: messageHash,
    });
    expect(mockStartSign).toHaveBeenCalledTimes(2);
  });

  it('throws when the MFA retry still returns mfa_required', async () => {
    const getProfileToken = jest.fn().mockResolvedValue('token');
    const keyring = makeKeyring(
      getProfileToken,
      undefined,
      jest.fn().mockResolvedValue(false),
    );
    await deserializeState(keyring);
    mockStartSign.mockResolvedValue(MFA_REQUIRED_CODE);

    await expect(
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).rejects.toThrow('MFA required');

    expect(getProfileToken).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ twoFactor: true }),
    );
    expect(mockStartSign).toHaveBeenCalledTimes(2);
    expect(mockCreateSession).not.toHaveBeenCalled();
  });

  it('runs TSS setup when the peer has discarded setup', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const signSession = makeRootSession('signing completed');
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

    const signSession = makeRootSession('signing completed');
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
    mockCreateSession.mockImplementation(async () =>
      makeRootSession('signing completed'),
    );

    await Promise.all([
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ]);

    expect(maxInFlight).toBe(1);
  });

  it('serializes sign, rotate, and sync on one op queue', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const order: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const track = async (label: string, work: () => Promise<void>) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      order.push(`${label}-start`);
      await new Promise((resolve) => setTimeout(resolve, 20));
      await work();
      order.push(`${label}-end`);
      inFlight -= 1;
    };

    mockCreateSession.mockImplementation(async () => makeRootSession());
    mockDklsSign.mockImplementation(async () => {
      await track('sign', async () => undefined);
      return { signature: new Uint8Array(64).fill(9) };
    });
    mockRotateKeyShares.mockImplementation(async () => {
      await track('rotate', async () => undefined);
      return {
        ...makeThresholdKey(),
        privateKeyShare: new Uint8Array([9, 9, 9]),
      };
    });
    mockCheckKeyShare.mockResolvedValue({
      latestShareEpoch: 2,
      latestBackupEpoch: 2,
      activeEpoch: 1,
    });
    mockLoadKeyShareBackup.mockImplementation(async () => {
      await track('sync', async () => undefined);
      return {
        encryptedKeyShare: new TextEncoder().encode(
          JSON.stringify({ ok: true }),
        ),
        epoch: 2,
      };
    });
    mockThresholdKeyFromJson.mockReturnValue({
      ...makeThresholdKey(),
      privateKeyShare: new Uint8Array([1, 1, 1]),
    });

    await Promise.all([
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
      keyring.rotateKeyShares(),
      keyring.syncKeyShare(),
    ]);

    expect(maxInFlight).toBe(1);
    expect(order).toStrictEqual([
      'sign-start',
      'sign-end',
      'rotate-start',
      'rotate-end',
      'sync-start',
      'sync-end',
    ]);
    expect(await keyring.serialize()).toStrictEqual(
      expect.objectContaining({
        shareEpoch: 2,
        tssSetup: null,
      }),
    );
  });

  it('signs typed data and validates signer constraints', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    mockCreateSession.mockResolvedValue(makeRootSession('signing completed'));

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

  describe('addAccounts', () => {
    it('throws if called before initialization', async () => {
      const keyring = makeKeyring();

      await expect(keyring.addAccounts()).rejects.toThrow(
        'MpcMoneyKeyring: has no account',
      );
    });

    it('throws if numberOfAccounts is not 1', async () => {
      const keyring = makeKeyring();
      await deserializeState(keyring);

      await expect(keyring.addAccounts(2)).rejects.toThrow(
        'MpcMoneyKeyring: supports adding exactly one account',
      );
    });

    it('returns the existing account after initialization', async () => {
      const keyring = makeKeyring();
      await deserializeState(keyring);

      expect(await keyring.addAccounts()).toStrictEqual([mockDerivedAddress]);
      expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
    });
  });

  it('throws for unsupported account APIs that are not implemented', async () => {
    const keyring = makeKeyring();

    await expect(
      keyring.getAppKeyAddress(mockDerivedAddress, 'example.com'),
    ).rejects.toThrow(
      `getAppKeyAddress(${mockDerivedAddress}, example.com): not implemented`,
    );
  });
});
