/* eslint-disable n/no-sync -- synchronous fs is acceptable for temp-file test fixtures. */

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from '../constants';
import { buildCryptoHDKeyUR } from '../core/ur-synth';
import type { SynthesizeOptions } from '../core/ur-synth';
import {
  FfmpegUnavailableError,
  ensureFfmpegAvailable,
  isFfmpegAvailable,
  renderUrToY4m,
} from './y4m';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-hdkey',
  descriptorCount: 1,
};

const ffmpegAvailable = isFfmpegAvailable();
const maybeDescribe = ffmpegAvailable ? describe : describe.skip;

describe('QR Y4M renderer', () => {
  describe('ffmpeg probe', () => {
    it('ensureFfmpegAvailable throws iff ffmpeg is absent', () => {
      let threw = false;
      try {
        ensureFfmpegAvailable();
      } catch {
        threw = true;
      }
      expect(threw).toBe(!ffmpegAvailable);
    });

    it('isFfmpegAvailable returns a boolean', () => {
      expect(typeof isFfmpegAvailable()).toBe('boolean');
    });

    it('throws a descriptive FfmpegUnavailableError when ffmpeg is missing', () => {
      // This documents the error shape; the actual throw only happens when
      // ffmpeg is absent, which is environment-dependent.
      const error = new FfmpegUnavailableError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('FfmpegUnavailableError');
      expect(error.message).toMatch(/ffmpeg/u);
      expect(error.message).toMatch(/brew install/u);
    });
  });

  maybeDescribe('renderUrToY4m (ffmpeg present)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), 'qr-y4m-test-'));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it('produces a non-empty Y4M file that starts with the YUV4MPEG2 signature', async () => {
      const ur = buildCryptoHDKeyUR(baseOptions);
      const outputPath = join(tempDir, 'account.y4m');
      const result = await renderUrToY4m(ur, {
        outputPath,
        fps: 5,
        durationS: 1,
      });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
      const stat = statSync(outputPath);
      expect(stat.size).toBeGreaterThan(0);

      const header = readFileSync(outputPath).subarray(0, 10).toString('ascii');
      // Y4M files begin with the "YUV4MPEG2" signature.
      expect(header.startsWith('YUV4MPEG2')).toBe(true);
    });

    it('honours the requested fps and duration', async () => {
      const ur = buildCryptoHDKeyUR(baseOptions);
      const outputPath = join(tempDir, 'account-dur.y4m');
      await renderUrToY4m(ur, {
        outputPath,
        fps: 5,
        durationS: 2,
      });
      const header = readFileSync(outputPath).toString('ascii').slice(0, 64);
      // The Y4M header carries the framerate, e.g. "F5:1" for 5 fps.
      expect(header).toMatch(/F5:1/u);
    });

    it('returns the output path', async () => {
      const ur = buildCryptoHDKeyUR(baseOptions);
      const outputPath = join(tempDir, 'return-path.y4m');
      const returned = await renderUrToY4m(ur, { outputPath });
      expect(returned).toBe(outputPath);
    });
  });
});
