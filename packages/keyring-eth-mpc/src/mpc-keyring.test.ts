/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { hashPersonalMessage } from '@ethereumjs/util';
import { type Hex, type Json, bytesToHex } from '@metamask/utils';

import { MPCKeyring, uninitializedResponderState } from './mpc-keyring';

const mockCreateKey = jest.fn();
const mockUpdateKey = jest.fn();
const mockDklsSetup = jest.fn();
const mockDklsSign = jest.fn();
const mockCreateIdentity = jest.fn();
const mockCreateSession = jest.fn();
const mockCreateScopedSessionId = jest.fn();
const mockThresholdKeyToJson = jest.fn();
const mockThresholdKeyFromJson = jest.fn();
const mockPartialThresholdKeyToJson = jest.fn();
const mockPartialThresholdKeyFromJson = jest.fn();
const mockNetworkIdentityToJson = jest.fn();
const mockNetworkIdentityFromJson = jest.fn();
const mockInitCloudKeyGen = jest.fn();
const mockInitCloudKeyUpdate = jest.fn();
const mockInitCloudSign = jest.fn();
let lastNetworkManagerOptions: Record<string, unknown> | undefined;

const mockDerivedAddress = '0x1111111111111111111111111111111111111111' as Hex;
const mockSessionNonce =
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as Hex;
const mockTypedDataHash = new Uint8Array([9, 8, 7, 6]);
const mockEthSignature = new Uint8Array(65);
mockEthSignature[64] = 27;

jest.mock('@metamask/mfa-wallet-cl24-lib', () => {
  class MockCL24DKM {
    createKey(...args: unknown[]) {
      return mockCreateKey(...args);
    }

    updateKey(...args: unknown[]) {
      return mockUpdateKey(...args);
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

  class MockCL24PartialThresholdKeySerializer {
    toJson(value: unknown) {
      return mockPartialThresholdKeyToJson(value);
    }

    fromJson(value: unknown) {
      return mockPartialThresholdKeyFromJson(value);
    }
  }

  return {
    secp256k1: {},
    CL24DKM: MockCL24DKM,
    CL24ThresholdKeySerializer: MockCL24ThresholdKeySerializer,
    CL24PartialThresholdKeySerializer: MockCL24PartialThresholdKeySerializer,
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

jest.mock('@metamask/mfa-wallet-dkls19-lib', () => {
  class MockDkls19TssLib {
    setup(...args: unknown[]) {
      return mockDklsSetup(...args);
    }

    sign(...args: unknown[]) {
      return mockDklsSign(...args);
    }
  }

  return { Dkls19TssLib: MockDkls19TssLib };
});

jest.mock('./cloud', () => ({
  initCloudKeyGen: (...args: unknown[]) => mockInitCloudKeyGen(...args),
  initCloudKeyUpdate: (...args: unknown[]) => mockInitCloudKeyUpdate(...args),
  initCloudSign: (...args: unknown[]) => mockInitCloudSign(...args),
}));

jest.mock('./util', () => {
  const actual = jest.requireActual('./util');
  return {
    ...actual,
    generateSessionNonce: jest.fn(() => mockSessionNonce),
    getSignedTypedDataHash: jest.fn(() => mockTypedDataHash),
    publicKeyToAddressHex: jest.fn(() => mockDerivedAddress),
    toEthSig: jest.fn(() => mockEthSignature),
  };
});

const makeThresholdKey = (custodianIds = ['local-user', 'cloud-user']) => {
  const shareIndexes = custodianIds.reduce<Record<string, number>>(
    (accumulator, custodianId, index) => {
      accumulator[custodianId] = index + 1;
      return accumulator;
    },
    {},
  );
  return {
    threshold: 2,
    custodians: custodianIds,
    shareIndexes,
    publicKey: new Uint8Array([4, 1, 2, 3]),
  };
};

const makeSerializedState = () => ({
  networkIdentity: { partyId: 'local-user' },
  keyShare: makeThresholdKey(),
  keyId: 'key-id-1',
  dkls19Setup: '0x0102',
  custodians: [
    { partyId: 'local-user', type: 'user' as const },
    { partyId: 'cloud-user', type: 'cloud' as const },
  ],
  verifierIds: ['verifier-1', 'verifier-2'],
  selectedVerifierIndex: 0,
});

const makeRootSession = (sessionId = 'root-session-id') => ({
  sessionId,
  createSubsession: jest
    .fn()
    .mockImplementation((label: string) => ({ label })),
  disconnect: jest.fn().mockResolvedValue(undefined),
});

const makeKeyring = (getVerifierToken = jest.fn().mockResolvedValue('token')) =>
  new MPCKeyring({
    getRandomBytes: (size) => new Uint8Array(size).fill(3),
    dkls19Lib: {} as never,
    cloudURL: 'https://cloud.example',
    relayerURL: 'https://relayer.example',
    getVerifierToken,
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
    mockedUtil.getSignedTypedDataHash.mockReturnValue(mockTypedDataHash);
    mockedUtil.publicKeyToAddressHex.mockReturnValue(mockDerivedAddress);
    mockedUtil.toEthSig.mockReturnValue(mockEthSignature);

    mockCreateScopedSessionId.mockImplementation(
      (partyIds: string[], nonce: string) =>
        `session:${partyIds.join('|')}:${nonce}`,
    );
    mockThresholdKeyToJson.mockImplementation((value) => value);
    mockThresholdKeyFromJson.mockImplementation((value) => value);
    mockPartialThresholdKeyToJson.mockImplementation((value) => value);
    mockPartialThresholdKeyFromJson.mockImplementation((value) => value);
    mockNetworkIdentityToJson.mockImplementation((value) => value);
    mockNetworkIdentityFromJson.mockImplementation((value) => value);
    mockInitCloudKeyGen.mockResolvedValue({ cloudId: 'cloud-user' });
    mockInitCloudKeyUpdate.mockResolvedValue(undefined);
    mockInitCloudSign.mockResolvedValue(undefined);
    mockDklsSetup.mockResolvedValue(new Uint8Array([1, 2, 3]));
    mockDklsSign.mockResolvedValue({ signature: new Uint8Array(64).fill(9) });
  });

  it('exposes the expected type and responder state constant', () => {
    const keyring = makeKeyring();
    expect(keyring.type).toBe('MPC Keyring');
    expect(uninitializedResponderState).toStrictEqual({
      initRole: 'responder',
    });
  });

  it('wires network manager options and random byte adapter', () => {
    const transportToken = jest.fn().mockResolvedValue('transport-token');
    const webSocket = { send: jest.fn() };
    const randomBytes = jest
      .fn()
      .mockReturnValueOnce(new Uint8Array([1, 2, 3, 4]));

    const keyring = new MPCKeyring({
      getRandomBytes: randomBytes,
      dkls19Lib: {} as never,
      cloudURL: 'https://cloud.example',
      relayerURL: 'https://relayer.example',
      getVerifierToken: jest.fn().mockResolvedValue('verifier-token'),
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
    expect(keyring.getCustodianId()).toBe('local-user');
    expect(keyring.getVerifierIds()).toStrictEqual([
      'verifier-1',
      'verifier-2',
    ]);
    expect(keyring.getSelectedVerifierId()).toBe('verifier-1');
    expect(await keyring.getAccounts()).toStrictEqual([mockDerivedAddress]);
  });

  it('throws on invalid deserialize input', async () => {
    const keyring = makeKeyring();
    await expect(keyring.deserialize(null as never)).rejects.toThrow(
      'Invalid state',
    );
  });

  it('does not initialize from incomplete serialized state', async () => {
    const keyring = makeKeyring();
    await keyring.deserialize({ keyId: 'only-key-id' });
    expect(() => keyring.getCustodianId()).toThrow('Keyring not initialized');
  });

  it('throws for verifier and custodian getters when uninitialized', () => {
    const keyring = makeKeyring();
    expect(() => keyring.getCustodians()).toThrow('Keyring not initialized');
    expect(() => keyring.getVerifierIds()).toThrow('Keyring not initialized');
    expect(() => keyring.selectVerifier(0)).toThrow('Keyring not initialized');
    expect(() => keyring.getSelectedVerifierId()).toThrow(
      'Keyring not initialized',
    );
  });

  it('selects verifiers and validates selection bounds', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    expect(keyring.selectVerifier(1)).toBe('verifier-2');
    expect(keyring.getSelectedVerifierId()).toBe('verifier-2');
    expect(() => keyring.selectVerifier(-1)).toThrow('Invalid verifier index');
  });

  it('creates a key in setup(create) mode', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession('created-key-id');

    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());

    await keyring.setup({ verifierIds: ['verifier-1'] });

    expect(mockInitCloudKeyGen).toHaveBeenCalledWith({
      localId: 'local-user',
      sessionNonce: mockSessionNonce,
      baseURL: 'https://cloud.example',
      verifierIds: ['verifier-1'],
    });
    expect(mockCreateKey).toHaveBeenCalledWith(
      expect.objectContaining({
        custodians: ['local-user', 'cloud-user'],
        threshold: 2,
      }),
    );
    expect(keyring.getCustodians()).toStrictEqual([
      { partyId: 'local-user', type: 'user' },
      { partyId: 'cloud-user', type: 'cloud' },
    ]);
    expect(keyring.getSelectedVerifierId()).toBe('verifier-1');
  });

  it('joins an existing key in setup(join) mode', async () => {
    const keyring = makeKeyring();

    const joinSession1 = {
      sendMessage: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const joinPayload = {
      cloudCustodian: 'cloud-user',
      nonce: '0xjoin-session',
      partialKey: makeThresholdKey(['initiator-user', 'cloud-user']),
      keyId: 'joined-key-id',
    };
    const joinSession2 = {
      receiveMessage: jest
        .fn()
        .mockResolvedValue(
          new TextEncoder().encode(JSON.stringify(joinPayload)),
        ),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const updateRootSession = makeRootSession('update-root');

    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'joined-user' });
    mockCreateSession
      .mockResolvedValueOnce(joinSession1)
      .mockResolvedValueOnce(joinSession2)
      .mockResolvedValueOnce(updateRootSession);
    mockUpdateKey.mockResolvedValueOnce(
      makeThresholdKey(['initiator-user', 'cloud-user', 'joined-user']),
    );

    const joinData = JSON.stringify({
      initiatorId: 'initiator-user',
      joinerIdentity: { partyId: 'ephemeral-joiner' },
      nonce: '0xjoin-nonce',
    });

    await keyring.setup({
      mode: 'join',
      verifierIds: ['verifier-1'],
      joinData,
    });

    expect(joinSession1.sendMessage).toHaveBeenCalledWith(
      'initiator-user',
      'static-id',
      expect.any(Uint8Array),
    );
    expect(keyring.getCustodians()).toStrictEqual([
      { partyId: 'initiator-user', type: 'user' },
      { partyId: 'cloud-user', type: 'cloud' },
      { partyId: 'joined-user', type: 'user' },
    ]);
  });

  it('rejects setup when already initialized or verifier list is empty', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    await expect(
      keyring.setup({ verifierIds: ['verifier-1'] }),
    ).rejects.toThrow('Keyring already setup');

    const freshKeyring = makeKeyring();
    await expect(freshKeyring.setup({ verifierIds: [] })).rejects.toThrow(
      'At least one verifier ID is required',
    );
  });

  it('treats undefined mode as create when setup mode is passed', async () => {
    const keyring = makeKeyring();
    const rootSession = makeRootSession('created-key-id');
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'local-user' });
    mockCreateSession.mockResolvedValueOnce(rootSession);
    mockCreateKey.mockResolvedValueOnce(makeThresholdKey());

    await keyring.setup({
      verifierIds: ['verifier-1'],
      mode: undefined,
    } as never);

    expect(keyring.getSelectedVerifierId()).toBe('verifier-1');
  });

  it('adds a custodian and updates local key state', async () => {
    const getVerifierToken = jest.fn().mockResolvedValue('verifier-token');
    const keyring = makeKeyring(getVerifierToken);
    await deserializeState(keyring);

    const joinSession1 = {
      receiveMessage: jest
        .fn()
        .mockResolvedValue(new TextEncoder().encode('new-user')),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const joinSession2 = {
      sendMessage: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    const updateRootSession = makeRootSession('post-add-root');

    mockCreateSession
      .mockResolvedValueOnce(joinSession1)
      .mockResolvedValueOnce(joinSession2)
      .mockResolvedValueOnce(updateRootSession);
    mockUpdateKey.mockResolvedValueOnce(
      makeThresholdKey(['local-user', 'cloud-user', 'new-user']),
    );

    await keyring.addCustodian(
      JSON.stringify({
        joinerIdentity: { partyId: 'ephemeral-joiner' },
        nonce: '0xadd-nonce',
      }),
    );

    expect(getVerifierToken).toHaveBeenCalledWith('verifier-1');
    expect(mockInitCloudKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-id-1',
        onlineCustodians: ['local-user', 'cloud-user'],
        newCustodians: ['local-user', 'cloud-user', 'new-user'],
      }),
    );
    expect(keyring.getCustodians()).toStrictEqual([
      { partyId: 'local-user', type: 'user' },
      { partyId: 'cloud-user', type: 'cloud' },
      { partyId: 'new-user', type: 'user' },
    ]);
  });

  it('throws for addCustodian preconditions', async () => {
    const keyring = makeKeyring();

    const wrongThresholdState = makeSerializedState();
    wrongThresholdState.keyShare = {
      ...wrongThresholdState.keyShare,
      threshold: 3,
    };
    await deserializeState(keyring, wrongThresholdState);
    await expect(keyring.addCustodian('{}')).rejects.toThrow(
      'Key threshold must be 2',
    );

    const missingCloudState = makeSerializedState();
    missingCloudState.custodians = [{ partyId: 'local-user', type: 'user' }];
    await deserializeState(keyring, missingCloudState);
    await expect(keyring.addCustodian('{}')).rejects.toThrow(
      'Cloud custodian not found',
    );
  });

  it('removes a user custodian and updates local key state', async () => {
    const getVerifierToken = jest.fn().mockResolvedValue('verifier-token');
    const keyring = makeKeyring(getVerifierToken);
    const state = makeSerializedState();
    state.keyShare = makeThresholdKey(['local-user', 'cloud-user', 'user-2']);
    state.custodians.push({ partyId: 'user-2', type: 'user' });
    await deserializeState(keyring, state);

    const updateRootSession = makeRootSession('post-remove-root');
    mockCreateSession.mockResolvedValueOnce(updateRootSession);
    mockUpdateKey.mockResolvedValueOnce(makeThresholdKey());

    await keyring.removeCustodian('user-2');

    expect(getVerifierToken).toHaveBeenCalledWith('verifier-1');
    expect(mockInitCloudKeyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-id-1',
        onlineCustodians: ['local-user', 'cloud-user'],
        newCustodians: ['local-user', 'cloud-user'],
      }),
    );
    expect(keyring.getCustodians()).toStrictEqual([
      { partyId: 'local-user', type: 'user' },
      { partyId: 'cloud-user', type: 'cloud' },
    ]);
  });

  it('throws for removeCustodian preconditions', async () => {
    const keyring = makeKeyring();

    const wrongThresholdState = makeSerializedState();
    wrongThresholdState.keyShare = {
      ...wrongThresholdState.keyShare,
      threshold: 3,
    };
    await deserializeState(keyring, wrongThresholdState);
    await expect(keyring.removeCustodian('user-2')).rejects.toThrow(
      'Key threshold must be 2',
    );

    await deserializeState(keyring, makeSerializedState());
    await expect(keyring.removeCustodian('local-user')).rejects.toThrow(
      'Cannot remove local custodian',
    );

    const missingCloudState = makeSerializedState();
    missingCloudState.custodians = [{ partyId: 'local-user', type: 'user' }];
    await deserializeState(keyring, missingCloudState);
    await expect(keyring.removeCustodian('user-2')).rejects.toThrow(
      'Cloud custodian not found',
    );

    await deserializeState(keyring, makeSerializedState());
    await expect(keyring.removeCustodian('cloud-user')).rejects.toThrow(
      'Cannot remove cloud custodian',
    );

    await expect(keyring.removeCustodian('unknown-user')).rejects.toThrow(
      'Custodian not found',
    );

    const nonUserState = makeSerializedState();
    nonUserState.custodians.push({ partyId: 'watcher', type: 'cloud' });
    nonUserState.keyShare = makeThresholdKey([
      'local-user',
      'cloud-user',
      'watcher',
    ]);
    await deserializeState(keyring, nonUserState);
    await expect(keyring.removeCustodian('watcher')).rejects.toThrow(
      'Only user custodians can be removed',
    );

    const notInKeyState = makeSerializedState();
    notInKeyState.custodians.push({ partyId: 'user-2', type: 'user' });
    await deserializeState(keyring, notInKeyState);
    await expect(keyring.removeCustodian('user-2')).rejects.toThrow(
      'Custodian not part of threshold key',
    );
  });

  it('signs personal messages and transactions through the MPC flow', async () => {
    const getVerifierToken = jest.fn().mockResolvedValue('verifier-token');
    const keyring = makeKeyring(getVerifierToken);
    await deserializeState(keyring);

    const signSession = {
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    mockCreateSession.mockResolvedValue(signSession);

    const messageHex = '0x68656c6c6f';
    const signatureHex = await keyring.signPersonalMessage(
      mockDerivedAddress,
      messageHex,
    );
    expect(signatureHex).toBe(bytesToHex(mockEthSignature));
    expect(mockInitCloudSign).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-id-1',
        localId: 'local-user',
        token: 'verifier-token',
        message: hashPersonalMessage(new TextEncoder().encode('hello')),
      }),
    );

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
    );
  });

  it('signs typed data and validates signer constraints', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);

    const signSession = {
      disconnect: jest.fn().mockResolvedValue(undefined),
    };
    mockCreateSession.mockResolvedValue(signSession);

    const signature = await keyring.signTypedData(
      mockDerivedAddress,
      [{ type: 'string', name: 'message', value: 'hello' }],
      {},
    );
    expect(signature).toBe(bytesToHex(mockEthSignature));
  });

  it('throws for signing with unknown account or missing cloud custodian', async () => {
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

    const state = makeSerializedState();
    state.custodians = [{ partyId: 'local-user', type: 'user' }];
    await deserializeState(keyring, state);

    await expect(
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).rejects.toThrow('Cloud custodian not found');
  });

  it('throws when selected verifier index is out of bounds during signing', async () => {
    const keyring = makeKeyring();
    const state = makeSerializedState();
    state.selectedVerifierIndex = 3;
    await deserializeState(keyring, state);

    await expect(
      keyring.signPersonalMessage(mockDerivedAddress, '0x68656c6c6f'),
    ).rejects.toThrow('Selected verifier index out of bounds');
  });

  it('throws when selected verifier index is invalid in getter', async () => {
    const keyring = makeKeyring();
    const state = makeSerializedState();
    state.selectedVerifierIndex = 3;
    await deserializeState(keyring, state);

    expect(() => keyring.getSelectedVerifierId()).toThrow(
      'Invalid selected verifier index',
    );
  });

  it('creates join data for initialized keyring', async () => {
    const keyring = makeKeyring();
    await deserializeState(keyring);
    mockCreateIdentity.mockResolvedValueOnce({ partyId: 'ephemeral-joiner' });

    const joinDataRaw = await keyring.createJoinData();
    const joinData = JSON.parse(joinDataRaw) as {
      initiatorId: string;
      joinerIdentity: { partyId: string };
      nonce: string;
    };

    expect(joinData.initiatorId).toBe('local-user');
    expect(joinData.joinerIdentity).toStrictEqual({
      partyId: 'ephemeral-joiner',
    });
    expect(joinData.nonce).toBe(mockSessionNonce);
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
