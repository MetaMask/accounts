import { fork, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import http from 'node:http';
import fs from 'node:fs';
import { TREZOR_TRANSPORT_BRIDGE_PORT } from './constants';

export interface SidecarManagerOptions {
  /** Path to @trezor/transport-bridge's bin.js. */
  bridgeBin?: string;
  /** Port for the static iframe-asset server. Default 8088. */
  assetServerPort?: number;
  /** Path to the connect-web iframe assets directory. */
  assetDir?: string;
  /** Delay (ms) to wait for the bridge to bind. Default 2000. Set 0 in tests. */
  bridgeStartupDelayMs?: number;
  /** Injectable for tests. */
  forkFn?: (modulePath: string, args?: string[], options?: any) => any;
}

export interface TrezorSidecarManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export function createSidecarManager(
  opts: SidecarManagerOptions = {},
): TrezorSidecarManager {
  const bridgeBin =
    opts.bridgeBin ??
    path.join(
      __dirname,
      '../../../../node_modules/@trezor/transport-bridge/dist/bin.js',
    );
  const assetPort = opts.assetServerPort ?? 8088;
  const assetDir =
    opts.assetDir ??
    path.join(
      __dirname,
      '../../../../node_modules/@trezor/connect-web-iface',
    );
  const forkFn = opts.forkFn ?? fork;
  const startupDelay = opts.bridgeStartupDelayMs ?? 2000;

  let bridgeProcess: ChildProcess | null = null;
  let assetServer: http.Server | null = null;
  let running = false;

  const serveAssets = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (!fs.existsSync(assetDir)) {
        return reject(
          new Error(
            `connect-web iframe assets not found at ${assetDir}. ` +
              `Run the iframe-asset fetcher first (see spec §5.3).`,
          ),
        );
      }
      assetServer = http.createServer((req, res) => {
        // match connect-web's expected structure: /iframe.html, /js/, /popup.html
        const filePath = path.join(
          assetDir,
          req.url === '/' ? 'iframe.html' : req.url ?? '',
        );
        if (!filePath.startsWith(assetDir)) {
          res.writeHead(403);
          res.end();
          return;
        }
        try {
          const content = fs.readFileSync(filePath);
          const ext = path.extname(filePath);
          const mime: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
          };
          res.writeHead(200, {
            'content-type': mime[ext] ?? 'application/octet-stream',
            'access-control-allow-origin': '*',
          });
          res.end(content);
        } catch {
          res.writeHead(404);
          res.end();
        }
      });
      assetServer!.listen(assetPort, () => resolve());
    });

  return {
    async start() {
      // 1. Start transport-bridge in UDP mode
      const bp = forkFn(bridgeBin, ['udp'], {
        stdio: 'pipe',
        env: { ...process.env },
      });
      bridgeProcess = bp;
      bp.on('error', (err: Error) => {
        console.error('[sidecar] transport-bridge error:', err.message);
      });

      // 2. Wait for the bridge to bind
      if (startupDelay > 0) {
        await new Promise((res) => setTimeout(res, startupDelay));
      }

      // 3. Start the iframe-asset server
      await serveAssets();

      running = true;
    },

    async stop() {
      if (assetServer) {
        await new Promise<void>((res) => assetServer!.close(() => res()));
        assetServer = null;
      }
      if (bridgeProcess && bridgeProcess.connected) {
        bridgeProcess.kill();
        bridgeProcess = null;
      }
      running = false;
    },

    isRunning() {
      return running;
    },
  };
}
