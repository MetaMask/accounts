import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface SidecarManagerOptions {
  assetServerPort?: number;
  assetDir?: string;
  corsProxyPort?: number;
  bridgeUrl?: string;
}

export interface TrezorSidecarManager {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

function createCorsProxy(port: number, upstream: string) {
  return new Promise<http.Server>((resolve, reject) => {
    const s = http.createServer(async (req, res) => {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        res.end();
        return;
      }
      try {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const headers: Record<string, string> = {
          'content-type': req.headers['content-type'] ?? 'application/json',
        };
        // Forward Origin so the bridge's whitelist check passes
        if (req.headers.origin) {
          headers.origin = req.headers.origin;
        }
        const r = await fetch(`${upstream}${req.url}`, {
          method: req.method,
          headers,
          body: req.method === 'GET' ? undefined : Buffer.concat(chunks),
        } as any);
        const b = Buffer.from(await r.arrayBuffer());
        res.writeHead(r.status, {
          'content-type': r.headers.get('content-type') ?? 'application/json',
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        });
        res.end(b);
      } catch (e) {
        res.writeHead(502, { 'access-control-allow-origin': '*' });
        res.end(JSON.stringify({ error: String((e as Error).message) }));
      }
    });
    s.on('error', reject);
    s.listen(port, '127.0.0.1', () => resolve(s));
  });
}

export function createSidecarManager(
  opts: SidecarManagerOptions = {},
): TrezorSidecarManager {
  const assetPort = opts.assetServerPort ?? 8088;
  const assetDir = opts.assetDir ?? path.join(process.cwd(), 'test/e2e/trezor/iframe-assets');
  const corsProxyPort = opts.corsProxyPort ?? 21328;
  const upstreamBridge = opts.bridgeUrl ?? 'http://127.0.0.1:21329';

  let assetServer: http.Server | null = null;
  let corsProxy: http.Server | null = null;

  return {
    async start() {
      if (corsProxy) { await new Promise<void>((r) => corsProxy!.close(() => r())); corsProxy = null; }
      if (assetServer) { await new Promise<void>((r) => assetServer!.close(() => r())); assetServer = null; }

      corsProxy = await createCorsProxy(corsProxyPort, upstreamBridge);
      // Also proxy 21325 (the iframe's secondary BridgeTransport default)
      try {
        await createCorsProxy(21325, upstreamBridge);
      } catch { /* port may be in use; best-effort */ }

      if (!fs.existsSync(assetDir)) {
        throw new Error(`connect-web iframe assets not found at ${assetDir}`);
      }
      assetServer = http.createServer((req, res) => {
        const url = req.url === '/' ? '/iframe.html' : req.url ?? '';
        const fp = path.join(assetDir, url);
        if (!fp.startsWith(assetDir)) { res.writeHead(403); res.end(); return; }
        try {
          const c = fs.readFileSync(fp);
          const ext = path.extname(fp);
          res.writeHead(200, {
            'content-type': { '.html': 'text/html', '.js': 'application/javascript' }[ext] ?? 'application/octet-stream',
            'access-control-allow-origin': '*',
          });
          res.end(c);
        } catch { res.writeHead(404); res.end(); }
      });
      await new Promise<void>((r) => assetServer!.listen(assetPort, '127.0.0.1', () => r()));
    },

    async stop() {
      if (corsProxy) { await new Promise<void>((r) => corsProxy!.close(() => r())); corsProxy = null; }
      if (assetServer) { await new Promise<void>((r) => assetServer!.close(() => r())); assetServer = null; }
    },

    isRunning() { return corsProxy !== null; },
  };
}
