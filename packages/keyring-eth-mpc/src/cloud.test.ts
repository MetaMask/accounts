import { bytesToBase64 } from '@metamask/utils';

import {
  checkKeyShareBackupId,
  createKey,
  getNetId,
  loadKeyShareBackup,
  registerClient,
  rotateKeyShares,
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
        headers: { 'Content-Type': 'application/json' },
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

  it('starts a cloud sign session with a base64-encoded message', async () => {
    okEmpty();
    const data = new Uint8Array([104, 105]); // "hi"

    await sign({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      clientNetId: 'local-1',
      nonce: '0xnonce',
      data,
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as { body: string }).body,
    ) as { data: string };
    expect(body.data).toBe('aGk=');
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
    });

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
      }),
    ).rejects.toThrow(
      'Failed to initialize cloud key rotation session: Forbidden',
    );
  });

  it('stores an encrypted key share backup', async () => {
    okEmpty();
    const encryptedKeyShare = new Uint8Array([1, 2, 3]);

    await storeKeyShareBackup({
      baseURL: 'https://cloud.example',
      token: 'token-1',
      backupId: 'backup-1',
      encryptedKeyShare,
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as { body: string }).body,
    ) as { encryptedKeyShare: string; backupId: string };
    expect(body.backupId).toBe('backup-1');
    expect(body.encryptedKeyShare).toBe(bytesToBase64(encryptedKeyShare));
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
        backupId: 'backup-1',
        encryptedKeyShare: new Uint8Array([1]),
      }),
    ).rejects.toThrow('Failed to store key share backup: Bad Request');
  });

  it('checks the stored backup id', async () => {
    okJson({ backupId: 'backup-1' });

    expect(
      await checkKeyShareBackupId({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toBe('backup-1');
  });

  it('returns null when the backend has no backup id', async () => {
    okJson({});

    expect(
      await checkKeyShareBackupId({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toBeNull();
  });

  it('throws when checking the backup id fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as never);

    await expect(
      checkKeyShareBackupId({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).rejects.toThrow('Failed to check key share backup id: Not Found');
  });

  it('loads an encrypted key share backup', async () => {
    const encryptedKeyShare = new Uint8Array([9, 8, 7]);
    okJson({
      encryptedKeyShare: bytesToBase64(encryptedKeyShare),
      backupId: 'backup-1',
    });

    expect(
      await loadKeyShareBackup({
        baseURL: 'https://cloud.example',
        token: 'token-1',
      }),
    ).toStrictEqual({
      encryptedKeyShare,
      backupId: 'backup-1',
    });
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
