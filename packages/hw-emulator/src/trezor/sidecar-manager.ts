import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface SidecarManagerOptions {
  /** Port for the static iframe-asset server. Default 8088. */
  assetServerPort?: number;
  /** Path to the connect-web iframe assets directory. */
  assetDir?: string;
}

export interface TrezorSidecarManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

export function createSidecarManager(
  opts: SidecarManagerOptions = {},
): TrezorSidecarManager {
  const assetPort = opts.assetServerPort ?? 8088;
  const assetDir =
    opts.assetDir ??
    path.join(__dirname, '../../../../test/e2e/trezor/iframe-assets');

  let assetServer: http.Server | null = null;
  let running = false;

  const serveAssets = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      if (!fs.existsSync(assetDir)) {
        return reject(
          new Error(
            `connect-web iframe assets not found at ${assetDir}. ` +
              `Run the iframe-asset fetcher first.`,
          ),
        );
      }
      assetServer = http.createServer((req, res) => {
        const url = req.url === '/' ? '/iframe.html' : req.url ?? '';
        const filePath = path.join(assetDir, url);
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
      assetServer.listen(assetPort, () => resolve());
    });

  return {
    async start() {
      await serveAssets();
      running = true;
    },

    async stop() {
      if (assetServer) {
        await new Promise<void>((res) => assetServer!.close(() => res()));
        assetServer = null;
      }
      running = false;
    },

    isRunning() {
      return running;
    },
  };
}
