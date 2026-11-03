/* eslint-disable n/no-sync -- synchronous fs is acceptable for temp-file test fixtures. */
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createProcessManager } from './process-manager';

/**
 * Find a free TCP port.
 *
 * @returns A momentarily free port number.
 */
async function findFreePort(): Promise<number> {
  const probe = net.createServer();
  await new Promise<void>((resolve) => {
    probe.listen(0, '127.0.0.1', () => resolve());
  });
  const address = probe.address();
  const port = address && typeof address === 'object' ? address.port : 0;
  await new Promise<void>((resolve) => {
    probe.close(() => resolve());
  });
  return port;
}

describe('createProcessManager', () => {
  it('returns an object with start, stop, status, and pid', () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    expect(manager.status).toBe('idle');
    expect(manager.pid).toBeUndefined();
    expect(typeof manager.start).toBe('function');
    expect(typeof manager.stop).toBe('function');
  });

  it('throws if start is called when not idle', async () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    // First start will try to spawn and fail (binary doesn't exist)
    // But we can test the status check by mocking
    await expect(manager.start()).rejects.toThrow('ENOENT');
  });

  it('stop resolves immediately when idle', async () => {
    const manager = createProcessManager({
      binary: '/usr/bin/speculos',
      app: '/path/to/app.elf',
    });
    await manager.stop();
    expect(manager.status).toBe('idle');
  });

  it('passes --load-nvram and the configured cwd to the spawned process', async () => {
    const apduPort = await findFreePort();
    const apiPort = await findFreePort();
    const fixtureDir = mkdtempSync(path.join(tmpdir(), 'pm-test-'));
    const fixture = path.join(fixtureDir, 'server.js');
    const recordFile = path.join(fixtureDir, 'spawn.json');
    // The fixture records its argv and cwd, then opens both readiness ports so
    // the manager considers startup complete.
    writeFileSync(
      fixture,
      [
        '#!/usr/bin/env node',
        'const fs = require("fs");',
        'const net = require("net");',
        `fs.writeFileSync(${JSON.stringify(recordFile)}, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }));`,
        `net.createServer(() => {}).listen(${apduPort}, "127.0.0.1");`,
        `net.createServer(() => {}).listen(${apiPort}, "127.0.0.1");`,
        'setInterval(() => {}, 1000);',
      ].join('\n'),
      'utf8',
    );
    chmodSync(fixture, 0o755);

    try {
      const manager = createProcessManager({
        binary: fixture,
        app: 'app.elf',
        loadNvram: true,
        cwd: fixtureDir,
        apduPort,
        apiPort,
        startTimeout: 15_000,
        stopTimeout: 5_000,
      });

      await manager.start();

      const record = JSON.parse(readFileSync(recordFile, 'utf8')) as {
        argv: string[];
        cwd: string;
      };

      // `--load-nvram` is a boolean flag: it must be a bare token, not a
      // `--load-nvram=<path>` pair.
      expect(record.argv).toStrictEqual([
        '--apdu-port',
        String(apduPort),
        '--api-port',
        String(apiPort),
        '--load-nvram',
        'app.elf',
      ]);
      // macOS tmpdirs are symlinked, so compare against the resolved path.
      expect(record.cwd).toBe(realpathSync(fixtureDir));

      await manager.stop();
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  }, 30_000);

  it('reuses an in-flight stop on concurrent calls', async () => {
    const apduPort = await findFreePort();
    const apiPort = await findFreePort();
    const fixtureDir = mkdtempSync(path.join(tmpdir(), 'pm-test-'));
    const fixture = path.join(fixtureDir, 'server.js');
    // A tiny Node server (invoked via its shebang so the manager's leading
    // --apdu-port/--api-port flags land in process.argv rather than being
    // parsed by the node binary). It opens both readiness ports and stays
    // alive until terminated.
    writeFileSync(
      fixture,
      [
        '#!/usr/bin/env node',
        'const net = require("net");',
        `net.createServer(() => {}).listen(${apduPort}, "127.0.0.1");`,
        `net.createServer(() => {}).listen(${apiPort}, "127.0.0.1");`,
        'setInterval(() => {}, 1000);',
      ].join('\n'),
      'utf8',
    );
    chmodSync(fixture, 0o755);

    try {
      const manager = createProcessManager({
        binary: fixture,
        app: 'ignored',
        apduPort,
        apiPort,
        startTimeout: 15_000,
        stopTimeout: 5_000,
      });

      await manager.start();
      expect(manager.status).toBe('listening');

      const firstStop = manager.stop();
      const secondStop = manager.stop();
      // Concurrent stops share the same in-flight promise instead of piling on
      // extra 'exit' listeners and SIGKILL timers.
      expect(secondStop).toBe(firstStop);

      await firstStop;
      expect(manager.status).toBe('idle');

      // A subsequent stop is a no-op.
      await manager.stop();
      expect(manager.status).toBe('idle');
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  }, 30_000);
});
