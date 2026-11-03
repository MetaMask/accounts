// eslint-disable-next-line import-x/no-nodejs-modules
import { createWriteStream } from 'node:fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import { request as httpRequest } from 'node:http';
// eslint-disable-next-line import-x/no-nodejs-modules
import type { IncomingMessage } from 'node:http';
// eslint-disable-next-line import-x/no-nodejs-modules
import { request as httpsRequest } from 'node:https';
// eslint-disable-next-line import-x/no-nodejs-modules
import { Stream } from 'node:stream';
// eslint-disable-next-line import-x/no-nodejs-modules
import { pipeline } from 'node:stream/promises';

import type { DownloadOptions } from './types';

/**
 * A PassThrough stream that emits a 'response' event when the HTTP(S) response is available.
 */
class DownloadStream extends Stream.PassThrough {
  /**
   * Returns a promise that resolves with the HTTP(S) IncomingMessage response.
   *
   * @returns The HTTP(S) response stream.
   */
  async response(): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      this.once('response', resolve);
      this.once('error', reject);
    });
  }
}

/**
 * Assert that a URL uses HTTPS.
 *
 * Downloads (including redirect targets) must use HTTPS so that archive
 * contents and checksums cannot be tampered with in transit.
 *
 * @param url - The URL to check.
 * @param context - Optional context describing where the URL came from, used
 * in the error message.
 * @throws If the URL does not use the `https:` protocol.
 */
export function assertHttpsUrl(url: URL, context?: string): void {
  if (url.protocol !== 'https:') {
    const origin = context ? ` (${context})` : '';
    throw new Error(
      `Refusing to download from "${url.toString()}"${origin}: only https: URLs are allowed, got "${url.protocol}".`,
    );
  }
}

/**
 * Start a download from the given URL.
 *
 * @param url - The HTTPS URL to download from.
 * @param options - Download options.
 * @param redirects - Current redirect count.
 * @returns A stream of the download.
 * @throws If the URL does not use the `https:` protocol.
 */
export function startDownload(
  url: URL,
  options: DownloadOptions = {},
  redirects: number = 0,
): DownloadStream {
  assertHttpsUrl(url);
  const MAX_REDIRECTS = options.maxRedirects ?? 5;
  const request = url.protocol === 'http:' ? httpRequest : httpsRequest;
  const stream = new DownloadStream();
  request(url, options, (response) => {
    stream.once('close', () => {
      response.destroy();
    });

    const { statusCode, statusMessage, headers } = response;
    if (
      statusCode &&
      statusCode >= 300 &&
      statusCode < 400 &&
      headers.location
    ) {
      if (redirects >= MAX_REDIRECTS) {
        stream.emit('error', new Error('Too many redirects'));
        response.destroy();
        return;
      }

      let redirectUrl: URL;
      try {
        redirectUrl = new URL(headers.location, url);
        assertHttpsUrl(redirectUrl, `redirect target from ${url.toString()}`);
      } catch (error) {
        stream.emit(
          'error',
          error instanceof Error ? error : new Error(String(error)),
        );
        response.destroy();
        return;
      }

      pipeline(
        startDownload(redirectUrl, options, redirects + 1).once(
          'response',
          stream.emit.bind(stream, 'response'),
        ),
        stream,
      ).catch(stream.emit.bind(stream, 'error'));
      response.destroy();
      return;
    }

    if (!statusCode || statusCode < 200 || statusCode >= 300) {
      stream.emit(
        'error',
        new Error(
          `Request to ${url.toString()} failed. Status Code: ${statusCode} - ${statusMessage}`,
        ),
      );
      response.destroy();
      return;
    }

    stream.emit('response', response);
    response.once('error', stream.emit.bind(stream, 'error'));
    pipeline(response, stream).catch(stream.emit.bind(stream, 'error'));
  })
    .once('error', stream.emit.bind(stream, 'error'))
    .end();
  return stream;
}

/**
 * Download a URL to a file on disk.
 *
 * @param url - The HTTPS URL to download from.
 * @param destinationPath - The path of the file to write.
 * @param options - Download options.
 * @throws If the URL does not use the `https:` protocol, or if the download
 * or write fails.
 */
export async function downloadToFile(
  url: URL,
  destinationPath: string,
  options: DownloadOptions = {},
): Promise<void> {
  assertHttpsUrl(url);
  await pipeline(
    startDownload(url, options),
    createWriteStream(destinationPath),
  );
}
