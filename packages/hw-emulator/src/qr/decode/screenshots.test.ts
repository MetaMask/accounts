/* eslint-disable n/no-sync -- synchronous zlib/fs is acceptable in test fixtures. */
/* eslint-disable no-bitwise -- CRC-32 and pixel packing in the PNG fixture require bitwise ops. */

/* eslint-disable @typescript-eslint/no-non-null-assertion -- CRC table index is provably in range. */

import { encodeToFragments } from '../codec/encoder';
import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from '../constants';
import { buildCryptoAccountUR, buildCryptoHDKeyUR } from '../core/ur-synth';
import type { SynthesizeOptions } from '../core/ur-synth';
import { renderQrPng } from '../render/png';
import {
  decodePngToRgb,
  decodeQrImage,
  decodeQrScreenshots,
} from './screenshots';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-account',
  descriptorCount: 5,
};

describe('QR screenshot decoder', () => {
  describe('decodeQrImage', () => {
    it('decodes a rendered single-frame PNG back to its fragment string', async () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragment = encodeToFragments(ur, 10_000)[0] as string;
      const png = renderQrPng(fragment);
      const decoded = await decodeQrImage(png);
      expect(decoded).toBe(fragment.toUpperCase());
    });

    it('returns null for a PNG with no QR code', async () => {
      // A valid PNG structure (grayscale) that is all-white: no QR decodable.
      const { deflateSync } = await import('node:zlib');
      const size = 32;
      const scanlines = Buffer.concat(
        Array.from({ length: size }, () =>
          Buffer.concat([Buffer.from([0]), Buffer.alloc(size, 255)]),
        ),
      );
      const signature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const ihdr = Buffer.alloc(13);
      ihdr.writeUInt32BE(size, 0);
      ihdr.writeUInt32BE(size, 4);
      ihdr[8] = 8;
      ihdr[9] = 0;
      const blankPng = Buffer.concat([
        signature,
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(scanlines)),
        chunk('IEND', Buffer.alloc(0)),
      ]);
      const decoded = await decodeQrImage(blankPng);
      expect(decoded).toBeNull();
    });
  });

  describe('decodePngToRgb', () => {
    it('throws on a malformed (non-PNG) buffer', () => {
      const junk = Buffer.from('not a png at all, just random text');
      expect(() => decodePngToRgb(junk)).toThrow(/not a png/iu);
    });

    it('round-trips a rendered PNG into width/height/data', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragment = encodeToFragments(ur, 10_000)[0] as string;
      const png = renderQrPng(fragment);
      const { width, height, data } = decodePngToRgb(png);
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(width).toBe(height);
      expect(data).toHaveLength(width * height);
    });
  });

  describe('decodeQrScreenshots', () => {
    it('reconstructs a multi-fragment UR from a sequence of rendered PNGs', async () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      expect(fragments.length).toBeGreaterThan(1);

      const pngs = fragments.map((fragment) => renderQrPng(fragment));
      const decoded = await decodeQrScreenshots(pngs);
      expect(decoded).toStrictEqual(ur);
    });

    it('reconstructs the UR regardless of screenshot order', async () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      const pngs = fragments.map((fragment) => renderQrPng(fragment));
      // Reverse the frame order (fountain decoding is order-independent).
      const decoded = await decodeQrScreenshots([...pngs].reverse());
      expect(decoded).toStrictEqual(ur);
    });

    it('accepts a mix of decodable and non-decodable frames', async () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      const pngs = fragments.map((fragment) => renderQrPng(fragment));
      // Inject a blank (non-QR) frame in the middle; the decoder skips nulls.
      const blank = renderQrPng('no-qr-here-just-text-padding');
      pngs.splice(Math.floor(pngs.length / 2), 0, blank);
      const decoded = await decodeQrScreenshots(pngs);
      expect(decoded).toStrictEqual(ur);
    });

    it('throws when the screenshots are insufficient to reconstruct the UR', async () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      // Provide only the first frame of a multi-fragment UR.
      const partial = [renderQrPng(fragments[0] as string)];
      await expect(decodeQrScreenshots(partial)).rejects.toThrow(
        /incomplete/iu,
      );
    });
  });
});

// PNG CRC-32 table (standard IEEE polynomial) for synthesizing a blank PNG fixture.
const CRC_TABLE: Uint32Array = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let entry = 0; entry < 256; entry++) {
    let current = entry;
    for (let bit = 0; bit < 8; bit++) {
      current = current & 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[entry] = current >>> 0;
  }
  return table;
})();

// Minimal PNG chunk helper for synthesizing a blank PNG in tests.
function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  let current = 0xffffffff;
  for (let i = 0; i < typeBuf.length + data.length; i++) {
    const byte = i < typeBuf.length ? typeBuf[i] : data[i - typeBuf.length];
    current = CRC_TABLE[(current ^ (byte as number)) & 0xff]! ^ (current >>> 8);
  }
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE((current ^ 0xffffffff) >>> 0, 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}
