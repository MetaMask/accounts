import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import type { IncomingMessage } from 'node:http';
import { createServer } from 'node:https';
import type { Server } from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertHttpsUrl, downloadToFile, startDownload } from './download';
import type { DownloadOptions } from './types';

describe('download', () => {
  describe('assertHttpsUrl', () => {
    it('accepts https URLs', () => {
      expect(() =>
        assertHttpsUrl(new URL('https://github.com/example/archive.tar.gz')),
      ).not.toThrow();
    });

    it('rejects http URLs', () => {
      expect(() =>
        assertHttpsUrl(new URL('http://github.com/example/archive.tar.gz')),
      ).toThrow(/only https: URLs are allowed, got "http:"/u);
    });

    it('rejects other protocols', () => {
      expect(() =>
        assertHttpsUrl(new URL('ftp://github.com/example/archive.tar.gz')),
      ).toThrow(/got "ftp:"/u);
    });

    it('includes redirect context in the error when provided', () => {
      expect(() =>
        assertHttpsUrl(
          new URL('http://evil.example.com/archive.tar.gz'),
          'redirect target from https://github.com/example',
        ),
      ).toThrow(/redirect target from https:\/\/github\.com\/example/u);
    });
  });

  describe('startDownload', () => {
    it('rejects http URLs without making a request', () => {
      expect(() =>
        startDownload(new URL('http://github.com/example/archive.tar.gz')),
      ).toThrow(/only https: URLs are allowed/u);
    });

    it('rejects other insecure protocols without making a request', () => {
      expect(() => startDownload(new URL('file:///etc/passwd'))).toThrow(
        /only https: URLs are allowed, got "file:"/u,
      );
    });
  });

  describe('downloadToFile', () => {
    it('rejects http URLs without creating the destination file', async () => {
      await expect(
        downloadToFile(
          new URL('http://github.com/example/archive.tar.gz'),
          '/tmp/speculos-up-should-not-exist.tar.gz',
        ),
      ).rejects.toThrow(/only https: URLs are allowed/u);
    });
  });

  describe('redirect Location validation (via assertHttpsUrl)', () => {
    // startDownload validates every redirect Location header with
    // assertHttpsUrl before following it; a redirect that downgrades to
    // http: is rejected with the same error.
    it('rejects a redirect Location that downgrades to http', () => {
      const redirectUrl = new URL(
        '/evil.tar.gz',
        new URL('https://github.com/example'),
      );
      const httpRedirect = new URL(
        `http://evil.example.com${redirectUrl.pathname}`,
      );
      expect(() =>
        assertHttpsUrl(
          httpRedirect,
          `redirect target from ${redirectUrl.toString()}`,
        ),
      ).toThrow(
        /Refusing to download from "http:\/\/evil\.example\.com\/evil\.tar\.gz" \(redirect target/u,
      );
    });

    it('accepts a redirect Location that stays on https', () => {
      const redirectUrl = new URL(
        'https://objects.githubusercontent.com/example.tar.gz',
      );
      expect(() =>
        assertHttpsUrl(redirectUrl, 'redirect target from https://github.com'),
      ).not.toThrow();
    });
  });

  describe('against a local HTTPS server', () => {
    const archiveContent = 'archive-bytes';
    // The local test server uses a self-signed certificate; the download
    // options carry `rejectUnauthorized: false` through to Node's HTTPS
    // request so the handshake succeeds in tests.
    const insecureTlsOptions = {
      rejectUnauthorized: false,
    } as unknown as DownloadOptions;

    let server: Server;
    let serverUrl: string;
    let certDir: string;

    const handler = (
      req: IncomingMessage,
      res: import('node:http').ServerResponse,
    ): void => {
      if (req.url === '/archive.tar.gz') {
        res.writeHead(200, { 'content-type': 'application/gzip' });
        res.end(archiveContent);
        return;
      }
      if (req.url === '/redirect-to-archive') {
        res.writeHead(302, { location: '/archive.tar.gz' });
        res.end();
        return;
      }
      if (req.url === '/redirect-to-http') {
        const { port } = server.address() as { port: number };
        res.writeHead(302, {
          location: `http://127.0.0.1:${port}/archive.tar.gz`,
        });
        res.end();
        return;
      }
      if ((req.url ?? '').match(/^\/loop/u)) {
        // Infinite redirect loop.
        res.writeHead(302, { location: req.url });
        res.end();
        return;
      }
      res.writeHead(404);
      res.end('not found');
    };

    /**
     * Collect the contents of a download stream.
     *
     * @param stream - The stream to read.
     * @returns The concatenated stream contents.
     */
    async function collectStream(
      stream: AsyncIterable<Buffer | string>,
    ): Promise<string> {
      let contents = '';
      for await (const chunk of stream) {
        contents += chunk.toString();
      }
      return contents;
    }

    beforeAll(async () => {
      certDir = await mkdtemp(join(tmpdir(), 'speculos-up-tls-'));
      const keyPath = join(certDir, 'key.pem');
      const certPath = join(certDir, 'cert.pem');
      await new Promise<void>((resolve, reject) => {
        execFile(
          'openssl',
          [
            'req',
            '-x509',
            '-newkey',
            'rsa:2048',
            '-keyout',
            keyPath,
            '-out',
            certPath,
            '-days',
            '1',
            '-nodes',
            '-subj',
            '/CN=localhost',
          ],
          (error: Error | null) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          },
        );
      });
      server = createServer(
        { key: await readFile(keyPath), cert: await readFile(certPath) },
        handler,
      );
      await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          resolve();
        });
      });
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('Expected the test server to listen on a port.');
      }
      serverUrl = `https://127.0.0.1:${String(address.port)}`;
    }, 15000);

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
      await rm(certDir, { recursive: true, force: true });
    });

    it('streams a successful response', async () => {
      const stream = startDownload(
        new URL(`${serverUrl}/archive.tar.gz`),
        insecureTlsOptions,
      );
      const response = await stream.response();
      expect(response.statusCode).toBe(200);
      expect(await collectStream(stream)).toBe(archiveContent);
    }, 10000);

    it('follows https redirects', async () => {
      const stream = startDownload(
        new URL(`${serverUrl}/redirect-to-archive`),
        insecureTlsOptions,
      );
      expect(await collectStream(stream)).toBe(archiveContent);
    }, 10000);

    it('rejects a redirect Location that downgrades to http', async () => {
      const stream = startDownload(
        new URL(`${serverUrl}/redirect-to-http`),
        insecureTlsOptions,
      );
      await expect(collectStream(stream)).rejects.toThrow(
        /only https: URLs are allowed/u,
      );
    }, 10000);

    it('errors on non-2xx status codes', async () => {
      const stream = startDownload(
        new URL(`${serverUrl}/missing`),
        insecureTlsOptions,
      );
      await expect(collectStream(stream)).rejects.toThrow(
        /failed\. Status Code: 404/u,
      );
    }, 10000);

    it('errors when too many redirects are followed', async () => {
      const stream = startDownload(new URL(`${serverUrl}/loop-1`), {
        ...insecureTlsOptions,
        maxRedirects: 1,
      });
      await expect(collectStream(stream)).rejects.toThrow(
        /Too many redirects/u,
      );
    }, 10000);

    it('errors when the connection fails', async () => {
      const stream = startDownload(
        new URL('https://127.0.0.1:1/archive.tar.gz'),
        insecureTlsOptions,
      );
      await expect(collectStream(stream)).rejects.toThrow(/ECONNREFUSED/u);
    }, 10000);

    it('downloads a URL to a file', async () => {
      const destinationPath = join(certDir, 'downloaded.tar.gz');
      await downloadToFile(
        new URL(`${serverUrl}/archive.tar.gz`),
        destinationPath,
        insecureTlsOptions,
      );
      expect(await readFile(destinationPath, 'utf8')).toBe(archiveContent);
    }, 10000);
  });
});
