import { initCloudKeyGen, initCloudKeyUpdate, initCloudSign } from './cloud';

describe('cloud helpers', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('initializes cloud key generation sessions', async () => {
    const json = jest.fn().mockResolvedValue({ serverCustodianId: 'cloud-1' });
    fetchSpy.mockResolvedValue({
      ok: true,
      json,
    } as never);

    expect(
      await initCloudKeyGen({
        baseURL: 'https://cloud.example',
        localId: 'local-1',
        sessionNonce: '0xnonce',
        verifierIds: ['verifier-1'],
      }),
    ).toStrictEqual({ cloudId: 'cloud-1' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/create-key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('throws when cloud key generation initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
    } as never);

    await expect(
      initCloudKeyGen({
        baseURL: 'https://cloud.example',
        localId: 'local-1',
        sessionNonce: '0xnonce',
        verifierIds: ['verifier-1'],
      }),
    ).rejects.toThrow(
      'Failed to initialize cloud keygen session: Unauthorized',
    );
  });

  it('initializes cloud key update sessions', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as never);

    await initCloudKeyUpdate({
      baseURL: 'https://cloud.example',
      keyId: 'key-1',
      onlineCustodians: ['local-1', 'cloud-1'],
      newCustodians: ['local-1', 'cloud-1', 'user-2'],
      sessionNonce: '0xnonce',
      token: 'token-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://cloud.example/update-key',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('throws when cloud key update initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Forbidden',
    } as never);

    await expect(
      initCloudKeyUpdate({
        baseURL: 'https://cloud.example',
        keyId: 'key-1',
        onlineCustodians: ['local-1', 'cloud-1'],
        newCustodians: ['local-1', 'cloud-1'],
        sessionNonce: '0xnonce',
        token: 'token-1',
      }),
    ).rejects.toThrow(
      'Failed to initialize cloud key update session: Forbidden',
    );
  });

  it('initializes cloud sign sessions with base64-encoded message', async () => {
    fetchSpy.mockResolvedValue({ ok: true } as never);
    const message = new Uint8Array([104, 105]); // "hi"

    await initCloudSign({
      baseURL: 'https://cloud.example',
      keyId: 'key-1',
      localId: 'local-1',
      sessionNonce: '0xnonce',
      message,
      token: 'token-1',
    });

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]?.[1] as { body: string }).body,
    ) as { message: string };
    expect(body.message).toBe('aGk=');
  });

  it('throws when cloud sign initialization fails', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      statusText: 'Server Error',
    } as never);

    await expect(
      initCloudSign({
        baseURL: 'https://cloud.example',
        keyId: 'key-1',
        localId: 'local-1',
        sessionNonce: '0xnonce',
        message: new Uint8Array([1]),
        token: 'token-1',
      }),
    ).rejects.toThrow('Failed to initialize cloud sign session: Server Error');
  });
});
