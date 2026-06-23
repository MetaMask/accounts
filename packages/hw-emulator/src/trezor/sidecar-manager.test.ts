import { createSidecarManager } from './sidecar-manager';

describe('TrezorSidecarManager', () => {
  it('start() serves assets, stop() closes the server', async () => {
    const started = createSidecarManager({
      assetDir: __dirname,
    });

    await started.start();
    expect(started.isRunning()).toBe(true);

    // Verify the server responds
    const resp = await fetch(`http://127.0.0.1:8088/`);
    expect(resp.status).toBe(200);

    await started.stop();
    expect(started.isRunning()).toBe(false);

    // After stop, the port should be closed
    await expect(fetch(`http://127.0.0.1:8088/`)).rejects.toThrow();
  });

  it('rejects when the asset dir does not exist', async () => {
    const started = createSidecarManager({
      assetDir: '/does/not/exist',
    });
    await expect(started.start()).rejects.toThrow(
      'connect-web iframe assets not found',
    );
  });
});
