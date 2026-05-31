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
 * Start a download from the given URL.
 *
 * @param url - The URL to download from.
 * @param options - Download options.
 * @param redirects - Current redirect count.
 * @returns A stream of the download.
 */
export function startDownload(
  url: URL,
  options: DownloadOptions = {},
  redirects: number = 0,
): DownloadStream {
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
      } else {
        pipeline(
          startDownload(
            new URL(headers.location, url),
            options,
            redirects + 1,
          ).once('response', stream.emit.bind(stream, 'response')),
          stream,
        ).catch(stream.emit.bind(stream, 'error'));
        response.destroy();
      }
    } else if (!statusCode || statusCode < 200 || statusCode >= 300) {
      stream.emit(
        'error',
        new Error(
          `Request to ${url.toString()} failed. Status Code: ${statusCode} - ${statusMessage}`,
        ),
      );
      response.destroy();
    } else {
      stream.emit('response', response);
      response.once('error', stream.emit.bind(stream, 'error'));
      pipeline(response, stream).catch(stream.emit.bind(stream, 'error'));
    }
  })
    .once('error', stream.emit.bind(stream, 'error'))
    .end();
  return stream;
}
