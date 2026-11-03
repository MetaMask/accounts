import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createSidecarManager } from './sidecar-manager';

const ASSET_SERVER_PORT = 8088;
const SECONDARY_PROXY_PORT = 21325;

type HttpResponse = {
  status: number;
  body: string;
};

/**
 * Checks whether a TCP port accepts connections on the loopback interface.
 *
 * @param port - The port to check.
 * @returns Whether the port is open.
 */
async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => {
      resolve(false);
    });
  });
}

async function request(
  port: number,
  requestOptions: http.RequestOptions,
  body?: string,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, ...requestOptions },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(chunk as Buffer);
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    if (body !== undefined) {
      req.write(body);
    }
    req.end();
  });
}

async function createAssetDir(
  fileName: string,
  content: string,
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sidecar-assets-'));
  await fs.writeFile(path.join(root, fileName), content);
  return root;
}

describe('TrezorSidecarManager', () => {
  let activeManager: ReturnType<typeof createSidecarManager> | null = null;

  afterEach(async () => {
    const manager = activeManager;
    activeManager = null;
    if (manager) {
      await manager.stop();
    }
  });

  it('start() serves assets, stop() closes the server', async () => {
    const assetDir = await createAssetDir('iframe.html', '<html></html>');
    const manager = createSidecarManager({ assetDir });
    activeManager = manager;

    await manager.start();
    expect(manager.isRunning()).toBe(true);

    const response = await request(ASSET_SERVER_PORT, { path: '/' });
    expect(response.status).toBe(200);
    expect(response.body).toBe('<html></html>');

    await manager.stop();
    expect(manager.isRunning()).toBe(false);

    // After stop, the port should be closed (the exact error depends on
    // the OS: connection refused, or reset if the socket lingers briefly)
    await expect(request(ASSET_SERVER_PORT, { path: '/' })).rejects.toThrow(
      /ECONNREFUSED|ECONNRESET/u,
    );
  }, 10_000);

  it('rejects when the asset dir does not exist', async () => {
    const manager = createSidecarManager({
      assetDir: '/does/not/exist',
      corsProxyPort: 21348,
    });
    activeManager = manager;

    await expect(manager.start()).rejects.toThrow(
      'connect-web iframe assets not found',
    );

    // A failed start() must not leave half-started servers behind: the
    // manager reports stopped and no proxy port is held open.
    expect(manager.isRunning()).toBe(false);
    expect(await isPortOpen(21348)).toBe(false);
  });

  it('stop() also closes the secondary CORS proxy on port 21325', async () => {
    const assetDir = await createAssetDir('iframe.html', '<html></html>');
    const manager = createSidecarManager({
      assetDir,
      corsProxyPort: 21358,
    });
    activeManager = manager;

    await manager.start();
    expect(await isPortOpen(21358)).toBe(true);
    expect(await isPortOpen(SECONDARY_PROXY_PORT)).toBe(true);

    await manager.stop();
    expect(await isPortOpen(21358)).toBe(false);
    expect(await isPortOpen(SECONDARY_PROXY_PORT)).toBe(false);
  }, 10_000);

  it('logs (does not swallow) EADDRINUSE when the secondary proxy port is taken', async () => {
    const assetDir = await createAssetDir('iframe.html', '<html></html>');

    // Occupy the secondary proxy port so the manager's best-effort bind on
    // 21325 fails with EADDRINUSE.
    const blocker = net.createServer();
    await new Promise<void>((resolve) => {
      blocker.listen(SECONDARY_PROXY_PORT, '127.0.0.1', () => resolve());
    });

    const warnSpy = jest
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);

    const manager = createSidecarManager({
      assetDir,
      corsProxyPort: 21388,
    });
    activeManager = manager;

    try {
      await manager.start();

      // The primary proxy is still up, so the sidecar reports running even
      // though the secondary proxy could not bind.
      expect(manager.isRunning()).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('secondary CORS proxy'),
        expect.anything(),
      );
    } finally {
      warnSpy.mockRestore();
      await new Promise<void>((resolve) => {
        blocker.close(() => resolve());
      });
    }
  }, 10_000);

  it('responds 413 when a proxied request body exceeds the 10MB cap', async () => {
    const assetDir = await createAssetDir('iframe.html', '<html></html>');
    const manager = createSidecarManager({
      assetDir,
      corsProxyPort: 21368,
    });
    activeManager = manager;

    await manager.start();

    const oversizedBody = 'a'.repeat(10 * 1024 * 1024 + 1);
    const response = await request(
      21368,
      {
        path: '/post',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
      oversizedBody,
    );
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body).error).toContain('exceeds');
  }, 20_000);

  it('blocks paths that escape the asset directory via prefix tricks', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sidecar-guard-'));
    const assetDir = path.join(root, 'assets');
    // Sibling whose name extends the asset dir name, so a naive
    // `startsWith(assetDir)` check would let it through after `..` removal.
    const siblingDir = path.join(root, 'assets-evil');
    await fs.mkdir(assetDir);
    await fs.mkdir(siblingDir);
    await fs.writeFile(path.join(siblingDir, 'secret.txt'), 'secret');
    await fs.writeFile(path.join(assetDir, 'iframe.html'), '<html></html>');

    try {
      const manager = createSidecarManager({
        assetDir,
        corsProxyPort: 21378,
      });
      activeManager = manager;
      await manager.start();

      const escaped = await request(ASSET_SERVER_PORT, {
        path: '/../assets-evil/secret.txt',
      });
      expect(escaped.status).toBe(403);
      expect(escaped.body).toBe('');

      // Regular files inside the asset dir still load.
      const ok = await request(ASSET_SERVER_PORT, {
        path: '/iframe.html',
      });
      expect(ok.status).toBe(200);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  }, 10_000);
});
