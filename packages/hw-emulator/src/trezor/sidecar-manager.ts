// eslint-disable-next-line import-x/no-nodejs-modules
import { Buffer } from 'node:buffer';
// eslint-disable-next-line import-x/no-nodejs-modules
import fs from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import http from 'node:http';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'node:path';
// eslint-disable-next-line import-x/no-nodejs-modules
import process from 'node:process';

import { TREZOR_TRANSPORT_BRIDGE_PORT } from './constants';

export type SidecarManagerOptions = {
  assetServerPort?: number;
  assetDir?: string;
  corsProxyPort?: number;
  bridgeUrl?: string;
};

export type TrezorSidecarManager = {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
};

/** Default port for the static connect-web iframe asset server. */
const DEFAULT_ASSET_SERVER_PORT = 8088;

/**
 * Default upstream port of the trezor-user-env bridge that the CORS proxy
 * forwards to.
 */
const DEFAULT_UPSTREAM_BRIDGE_PORT = 21329;

/**
 * Port of the iframe's secondary BridgeTransport default. Proxied
 * best-effort alongside the primary CORS proxy.
 */
const SECONDARY_CORS_PROXY_PORT = 21325;

/**
 * Maximum request-body size the CORS proxy buffers before rejecting with
 * `413 Content Too Large` (10 MB).
 */
const MAX_PROXY_BODY_BYTES = 10 * 1024 * 1024;

const CORS_RESPONSE_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

async function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => {
      resolve();
    });
  });
}

/**
 * Buffer a request body, up to `maxBytes`.
 *
 * Drains the whole stream (discarding data once the cap is exceeded) so the
 * connection stays consistent, but never buffers unbounded request bodies in
 * memory. HEAD requests carry no body, so nothing is read for them.
 *
 * @param req - The incoming request.
 * @param maxBytes - The maximum number of bytes to buffer.
 * @returns The buffered body, or `null` when it exceeds `maxBytes`.
 */
async function bufferRequestBody(
  req: http.IncomingMessage,
  maxBytes: number,
): Promise<Buffer | null> {
  // HEAD responses have no body; attempting to read one would stall the
  // request until the client times out.
  if (req.method === 'HEAD') {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  let buffered = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    const data = chunk as Buffer;
    if (tooLarge) {
      continue;
    }
    chunks.push(data);
    buffered += data.length;
    if (buffered > maxBytes) {
      tooLarge = true;
      chunks.length = 0;
    }
  }
  return tooLarge ? null : Buffer.concat(chunks);
}

async function handleCorsRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  upstream: string,
): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_RESPONSE_HEADERS);
    res.end();
    return;
  }
  try {
    const body = await bufferRequestBody(req, MAX_PROXY_BODY_BYTES);
    if (body === null) {
      res.writeHead(413, CORS_RESPONSE_HEADERS);
      res.end(
        JSON.stringify({
          error: `request body exceeds ${MAX_PROXY_BODY_BYTES} bytes`,
        }),
      );
      return;
    }
    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] ?? 'application/json',
    };
    // Forward Origin so the bridge's whitelist check passes
    if (req.headers.origin) {
      headers.origin = req.headers.origin;
    }
    const requestInit: RequestInit = {
      method: req.method ?? 'GET',
      headers,
    };
    // HEAD (like GET) must not carry a body.
    if (requestInit.method !== 'GET' && requestInit.method !== 'HEAD') {
      requestInit.body = new Uint8Array(body);
    }
    const upstreamResponse = await fetch(`${upstream}${req.url}`, requestInit);
    const responseBody = Buffer.from(await upstreamResponse.arrayBuffer());
    res.writeHead(upstreamResponse.status, {
      'content-type':
        upstreamResponse.headers.get('content-type') ?? 'application/json',
      ...CORS_RESPONSE_HEADERS,
    });
    res.end(responseBody);
  } catch (error) {
    res.writeHead(502, CORS_RESPONSE_HEADERS);
    res.end(JSON.stringify({ error: String((error as Error).message) }));
  }
}

async function createCorsProxy(
  port: number,
  upstream: string,
): Promise<http.Server> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // handleCorsRequest handles its own errors (502 responses); the
      // trailing catch is a safety net for the error path itself.
      handleCorsRequest(req, res, upstream).catch(() => undefined);
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

class SidecarManager implements TrezorSidecarManager {
  readonly #assetPort: number;

  readonly #assetDir: string;

  readonly #corsProxyPort: number;

  readonly #upstreamBridge: string;

  #assetServer: http.Server | null = null;

  #corsProxy: http.Server | null = null;

  #secondaryCorsProxy: http.Server | null = null;

  constructor(opts: SidecarManagerOptions = {}) {
    this.#assetPort = opts.assetServerPort ?? DEFAULT_ASSET_SERVER_PORT;
    this.#assetDir =
      opts.assetDir ??
      path.join(process.cwd(), 'test/e2e/trezor/iframe-assets');
    this.#corsProxyPort = opts.corsProxyPort ?? TREZOR_TRANSPORT_BRIDGE_PORT;
    this.#upstreamBridge =
      opts.bridgeUrl ?? `http://127.0.0.1:${DEFAULT_UPSTREAM_BRIDGE_PORT}`;
  }

  async start(): Promise<void> {
    await this.stop();

    // Validate the asset dir before binding anything so a missing dir
    // cannot leave half-started listening servers behind.
    if (!fs.existsSync(this.#assetDir)) {
      throw new Error(
        `connect-web iframe assets not found at ${this.#assetDir}`,
      );
    }
    const resolvedAssetDir = path.resolve(this.#assetDir);

    try {
      this.#corsProxy = await createCorsProxy(
        this.#corsProxyPort,
        this.#upstreamBridge,
      );
      // Also proxy 21325 (the iframe's secondary BridgeTransport default)
      try {
        this.#secondaryCorsProxy = await createCorsProxy(
          SECONDARY_CORS_PROXY_PORT,
          this.#upstreamBridge,
        );
      } catch (error) {
        // Best-effort: the port may already be in use by another instance.
        // Log so the failure (e.g. EADDRINUSE) is not silent.
        console.warn(
          `TrezorSidecarManager: failed to start secondary CORS proxy on port ${SECONDARY_CORS_PROXY_PORT}:`,
          error,
        );
      }

      const assetServer = http.createServer((req, res) => {
      const url = req.url === '/' ? '/iframe.html' : (req.url ?? '');
      // `path.join` normalizes `..` segments while keeping the result
      // anchored at the asset dir; the resolved-prefix check then ensures
      // the normalized path cannot escape it (e.g. via `/../sibling-dir/`).
      const filePath = path.join(resolvedAssetDir, url);
      if (!filePath.startsWith(resolvedAssetDir + path.sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const content = fs.readFileSync(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, {
          'content-type':
            {
              '.html': 'text/html',
              '.js': 'application/javascript',
            }[ext] ?? 'application/octet-stream',
          'access-control-allow-origin': '*',
        });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((resolve) => {
      assetServer.listen(this.#assetPort, '127.0.0.1', () => {
        resolve();
      });
    });
    this.#assetServer = assetServer;
    } catch (startError: unknown) {
      // A later startup step failed: tear down everything already bound
      // so start() never leaves half-open servers behind.
      await this.stop();
      throw startError;
    }
  }

  async stop(): Promise<void> {
    const staleSecondaryProxy = this.#secondaryCorsProxy;
    const stalePrimaryProxy = this.#corsProxy;
    const staleAssetServer = this.#assetServer;
    this.#secondaryCorsProxy = null;
    this.#corsProxy = null;
    this.#assetServer = null;
    if (staleSecondaryProxy) {
      await closeServer(staleSecondaryProxy);
    }
    if (stalePrimaryProxy) {
      await closeServer(stalePrimaryProxy);
    }
    if (staleAssetServer) {
      await closeServer(staleAssetServer);
    }
  }

  isRunning(): boolean {
    return (
      this.#corsProxy !== null ||
      this.#secondaryCorsProxy !== null ||
      this.#assetServer !== null
    );
  }
}

/**
 * Creates a Trezor sidecar manager: a CORS proxy for the Trezor bridge and
 * a static file server for the connect-web iframe assets.
 *
 * @param opts - Optional overrides for ports, asset directory, and bridge URL.
 * @returns The sidecar manager.
 */
export function createSidecarManager(
  opts: SidecarManagerOptions = {},
): TrezorSidecarManager {
  return new SidecarManager(opts);
}
