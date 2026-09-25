import { bytesToBase64 } from '@metamask/utils';

import {
  checkKeyShare,
  createKey,
  getNetId,
  loadKeyShareBackup,
  registerClient,
  rotateKeyShares,
  setActiveEpoch,
  sign,
  storeKeyShareBackup,
} from './cloud';

describe('cloud helpers', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  const okJson = (body: unknown): void => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    } as never);
  };

  const okEmpty = (): void => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(''),
    } as never);
  };

  it('gets the server network id', async () => {
    okJson({ netId: 'server-1' });

    expect(
      await getNetId({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toBe('server-1');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/net-id',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-1',
        },
        body: '{}',
      }),
    );
  });

  it('throws when getting the server network id fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    } as never);

    await expect(
      getNetId({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).rejects.toThrow('Failed to get server network id: Unauthorized');
  });

  it('starts cloud key generation', async () => {
    okEmpty();

    await createKey({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      clientNetId: 'local-1',
      nonce: '0xnonce',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/create-key',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when cloud key generation initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    } as never);

    await expect(
      createKey({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        clientNetId: 'local-1',
        nonce: '0xnonce',
      }),
    ).rejects.toThrow(
      'Failed to initialize cloud keygen session: Unauthorized',
    );
  });

  it('registers a client network id', async () => {
    okEmpty();

    await registerClient({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      clientNetId: 'local-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/register-client',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when client registration fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    } as never);

    await expect(
      registerClient({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        clientNetId: 'local-1',
      }),
    ).rejects.toThrow('Failed to register client: Forbidden');
  });

  it('starts a cloud sign session with epoch and base64-encoded message', async () => {
    okEmpty();
    const data = new Uint8Array([104, 105]); // "hi"

    await sign({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      clientNetId: 'local-1',
      nonce: '0xnonce',
      data,
      shareEpoch: 1,
    });

    const init = fetchSpy.mock.calls[0]?.[1] as {
      body: string;
      headers: Record<string, string>;
    };
    expect(init.headers.Authorization).toBe('Bearer token-1');
    const body = JSON.parse(init.body) as {
      data: string;
      shareEpoch: number;
      token?: string;
    };
    expect(body.data).toBe('aGk=');
    expect(body.shareEpoch).toBe(1);
    expect(body.token).toBeUndefined();
  });

  it('throws when cloud sign initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
    } as never);

    await expect(
      sign({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        clientNetId: 'local-1',
        nonce: '0xnonce',
        data: new Uint8Array([1]),
        shareEpoch: 1,
      }),
    ).rejects.toThrow('Failed to initialize cloud sign session: Server Error');
  });

  it('starts a cloud key rotation session', async () => {
    okEmpty();

    await rotateKeyShares({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      clientNetId: 'local-1',
      nonce: '0xnonce',
      expectedActiveEpoch: 1,
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as { body: string }).body,
    ) as { expectedActiveEpoch: number };
    expect(body.expectedActiveEpoch).toBe(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/rotate-key-shares',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when cloud key rotation initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    } as never);

    await expect(
      rotateKeyShares({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        clientNetId: 'local-1',
        nonce: '0xnonce',
        expectedActiveEpoch: 1,
      }),
    ).rejects.toThrow(
      'Failed to initialize cloud key rotation session: Forbidden',
    );
  });

  it('stores an encrypted key share backup for an epoch', async () => {
    okEmpty();
    const encryptedKeyShare = new Uint8Array([1, 2, 3]);

    await storeKeyShareBackup({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      epoch: 2,
      attemptNonce: '0xnonce',
      encryptedKeyShare,
    });

    const init = fetchSpy.mock.calls[0]?.[1] as {
      body: string;
      headers: Record<string, string>;
    };
    expect(init.headers.Authorization).toBe('Bearer token-1');
    const body = JSON.parse(init.body) as {
      encryptedKeyShare: string;
      epoch: number;
      attemptNonce: string;
      token?: string;
    };
    expect(body.epoch).toBe(2);
    expect(body.attemptNonce).toBe('0xnonce');
    expect(body.encryptedKeyShare).toBe(bytesToBase64(encryptedKeyShare));
    expect(body.token).toBeUndefined();
  });

  it('throws when storing a key share backup fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
    } as never);

    await expect(
      storeKeyShareBackup({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        epoch: 1,
        attemptNonce: '0xnonce',
        encryptedKeyShare: new Uint8Array([1]),
      }),
    ).rejects.toThrow('Failed to store key share backup: Bad Request');
  });

  it('checks key share epochs', async () => {
    okJson({
      latestShareEpoch: 2,
      latestBackupEpoch: 2,
      activeEpoch: 1,
    });

    expect(
      await checkKeyShare({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toStrictEqual({
      latestShareEpoch: 2,
      latestBackupEpoch: 2,
      activeEpoch: 1,
    });
  });

  it('throws when checking key share fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as never);

    await expect(
      checkKeyShare({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).rejects.toThrow('Failed to check key share: Not Found');
  });

  it('sets the active epoch', async () => {
    okEmpty();

    await setActiveEpoch({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      epoch: 2,
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as { body: string }).body,
    ) as { epoch: number };
    expect(body.epoch).toBe(2);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/set-active-epoch',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws when setting the active epoch fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Conflict',
    } as never);

    await expect(
      setActiveEpoch({
        baseURL: 'https://cloud.example',
        token: 'token-1',
        epoch: 2,
      }),
    ).rejects.toThrow('Failed to set active epoch: Conflict');
  });

  it('loads an encrypted key share backup', async () => {
    const encryptedKeyShare = new Uint8Array([9, 8, 7]);
    okJson({
      encryptedKeyShare: bytesToBase64(encryptedKeyShare),
      epoch: 3,
    });

    expect(
      await loadKeyShareBackup({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toStrictEqual({
      encryptedKeyShare,
      epoch: 3,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/load-key-share-backup',
      expect.objectContaining({
        method: 'GET',
        headers: { Authorization: 'Bearer token-1' },
      }),
    );
  });

  it('throws when loading a key share backup fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    } as never);

    await expect(
      loadKeyShareBackup({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).rejects.toThrow('Failed to load key share backup: Unauthorized');
  });
});
