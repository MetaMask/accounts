/* eslint-disable import-x/no-nodejs-modules -- child_process and fs are required to spawn ffmpeg and clean up partial output. */

import { spawn, spawnSync } from 'node:child_process';
import { rm } from 'node:fs/promises';

import { encodeToFragments } from '../codec/encoder';
import { QR_REFRESH_MS, QR_Y4M_RENDER_SIZE_PX } from '../constants';
import type { SerializedUR } from '../core/ur-synth';
import { renderQrPng } from './png';

/** Options for rendering an animated QR to a Y4M video file. */
export type Y4mRenderOptions = {
  /** Frames per second (defaults to 5, matching `QR_REFRESH_MS`). */
  fps?: number;
  /** Total duration in seconds (defaults to 4). */
  durationS?: number;
  /** Output file path for the `.y4m` file. */
  outputPath: string;
  /** Target square edge length in pixels (defaults to `QR_Y4M_RENDER_SIZE_PX`). */
  size?: number;
};

const DEFAULT_FPS = Math.round(1000 / QR_REFRESH_MS); // 5
const DEFAULT_DURATION_S = 4;
const DEFAULT_PIX_FMT = 'yuv420p';

let ffmpegChecked: boolean | undefined;

/** Error thrown when ffmpeg is required but not installed. */
export class FfmpegUnavailableError extends Error {
  constructor() {
    super(
      [
        'ffmpeg is required to render Y4M video but was not found on PATH.',
        'Install it with one of:',
        '  macOS:  brew install ffmpeg',
        '  Debian/Ubuntu:  sudo apt install ffmpeg',
        '  Fedora:  sudo dnf install ffmpeg',
        'The PNG rendering and screenshot-decoding paths do not require ffmpeg.',
      ].join('\n'),
    );
    this.name = 'FfmpegUnavailableError';
  }
}

/**
 * Probe for the `ffmpeg` binary. Runs once per process; the result is cached.
 *
 * @throws {FfmpegUnavailableError} If ffmpeg is not available, with
 * platform-specific install advice.
 */
export function ensureFfmpegAvailable(): void {
  if (ffmpegChecked !== undefined) {
    if (!ffmpegChecked) {
      throw new FfmpegUnavailableError();
    }
    return;
  }
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  const available = result.status === 0;
  ffmpegChecked = available;
  if (!available) {
    throw new FfmpegUnavailableError();
  }
}

/**
 * Check whether ffmpeg is available without throwing.
 *
 * @returns `true` if ffmpeg is installed and invokable.
 */
export function isFfmpegAvailable(): boolean {
  try {
    ensureFfmpegAvailable();
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the ffmpeg argument list for piping PNG frames into a Y4M file.
 *
 * @param opts - Resolved render options.
 * @returns The ffmpeg argv (without the leading `ffmpeg`).
 */
function buildFfmpegArgs(
  opts: Required<Omit<Y4mRenderOptions, 'outputPath'>> & {
    outputPath: string;
  },
): string[] {
  return [
    '-y',
    '-f',
    'image2pipe',
    '-framerate',
    String(opts.fps),
    '-i',
    '-',
    '-t',
    String(opts.durationS),
    '-vf',
    `scale=${opts.size}:${opts.size}:flags=neighbor`,
    '-pix_fmt',
    DEFAULT_PIX_FMT,
    opts.outputPath,
  ];
}

/**
 * Render a SerializedUR into an animated QR Y4M file via ffmpeg.
 *
 * Each fountain fragment is rendered to a PNG and piped to ffmpeg's
 * `image2pipe` input; fragments are cycled for the full duration so the BC-UR
 * fountain decoder on the receiving side has ample opportunity to reconstruct
 * the UR.
 *
 * @param ur - The SerializedUR to animate.
 * @param options - Render options (output path required).
 * @returns The output path on success.
 * @throws {FfmpegUnavailableError} If ffmpeg is not installed.
 */
export async function renderUrToY4m(
  ur: SerializedUR,
  options: Y4mRenderOptions,
): Promise<string> {
  ensureFfmpegAvailable();

  const fps = options.fps ?? DEFAULT_FPS;
  const durationS = options.durationS ?? DEFAULT_DURATION_S;
  const size = options.size ?? QR_Y4M_RENDER_SIZE_PX;

  const fragments = encodeToFragments(ur);
  const frameCount = Math.max(1, fps * durationS);

  const args = buildFfmpegArgs({
    fps,
    durationS,
    size,
    outputPath: options.outputPath,
  });

  await new Promise<void>((resolve, reject) => {
    const child = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });

    let settled = false;
    /**
     * Settle the render promise exactly once. On failure, best-effort remove
     * the partial output file first so it cannot poison later runs, then
     * reject.
     *
     * @param error - The failure reason, or `undefined` on success.
     */
    const finish = (error?: Error): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (!error) {
        resolve();
        return;
      }
      // eslint-disable-next-line promise/no-promise-in-callback -- best-effort removal of the partial output file before rejecting
      rm(options.outputPath, { force: true })
        .catch(() => undefined)
        .finally(() => {
          reject(error);
        });
    };

    let stderr = '';
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error: Error) => finish(error));
    child.on('close', (code) => {
      if (code === 0) {
        finish();
      } else {
        finish(new Error(`ffmpeg exited with code ${String(code)}\n${stderr}`));
      }
    });

    const { stdin } = child;
    if (!stdin) {
      finish(new Error('ffmpeg stdin stream unavailable'));
      return;
    }

    // An early ffmpeg exit surfaces as an EPIPE 'error' event on stdin;
    // without a listener the process would crash.
    stdin.on('error', (error: Error) => finish(error));

    try {
      for (let i = 0; i < frameCount; i++) {
        // encodeToFragments (BC-UR fountain encoding) always yields at
        // least one fragment, so direct indexing is safe.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- fragment index is provably in range
        const fragment = fragments[i % fragments.length]!;
        const png = renderQrPng(fragment, size);
        stdin.write(png);
      }
      stdin.end();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });

  return options.outputPath;
}
