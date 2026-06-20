/* eslint-disable no-restricted-globals -- Buffer is required for binary PNG encoding. */
/* eslint-disable no-bitwise -- CRC-32 checksums and pixel packing require bitwise ops. */
/* eslint-disable import-x/no-nodejs-modules -- zlib is required for PNG IDAT compression. */
/* eslint-disable id-length -- single-letter pixel/crc loop variables are idiomatic in image code. */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- CRC table index is provably in range. */

import { deflateSync } from 'node:zlib';
import qrcode from 'qrcode-generator';

import { QR_CODE_SIZE_PX, QR_UPPERCASE } from '../constants';

/** QR error-correction level (mirrors `qrcode-generator`'s union). */
type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Precomputed CRC-32 table (PNG uses the standard IEEE polynomial).
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

/**
 * Compute the CRC-32 of a buffer (PNG chunk checksum).
 *
 * @param data - The bytes to checksum.
 * @returns The unsigned 32-bit CRC.
 */
function crc32(data: Buffer): number {
  let current = 0xffffffff;
  for (const byte of data) {
    current = CRC_TABLE[(current ^ byte) & 0xff]! ^ (current >>> 8);
  }
  return (current ^ 0xffffffff) >>> 0;
}
/**
 * Build a PNG chunk (length + type + data + CRC).
 *
 * @param type - The 4-byte chunk type.
 * @param data - The chunk payload.
 * @returns The serialized chunk.
 */
function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

/**
 * Render a BC-UR fragment string to a QR code PNG buffer.
 *
 * The value is uppercased before encoding when `QR_UPPERCASE` is set (mirroring
 * MetaMask's `player.js`, which renders `currentQRCode.toUpperCase()`). The
 * target edge length is {@link QR_CODE_SIZE_PX}; the actual size is the largest
 * integer multiple of the module size that fits, ensuring a crisp 1:1 cell
 * mapping (no sub-pixel scaling) and a standard 4-module quiet zone for
 * reliable decoding.
 *
 * The QR module matrix is read from `qrcode-generator` and encoded as an
 * 8-bit grayscale PNG directly (no native image dependency), so the output is
 * a real PNG that `decodePngToRgb` and `@zxing/library` can read back.
 *
 * @param value - The fragment string to encode.
 * @param targetSize - Target edge length in pixels (defaults to
 * `QR_CODE_SIZE_PX`).
 * @param errorCorrectionLevel - QR error-correction level (defaults to `'M'`).
 * @returns A PNG-encoded Buffer.
 */
export function renderQrPng(
  value: string,
  targetSize: number = QR_CODE_SIZE_PX,
  errorCorrectionLevel: ErrorCorrectionLevel = 'M',
): Buffer {
  const encoded = QR_UPPERCASE ? value.toUpperCase() : value;
  const qr = qrcode(0, errorCorrectionLevel);
  qr.addData(encoded);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const margin = 4; // standard quiet zone, in modules
  const cellSize = Math.max(
    1,
    Math.floor(targetSize / (moduleCount + margin * 2)),
  );
  const pixelsPerSide = (moduleCount + margin * 2) * cellSize;

  // Build raw grayscale scanlines (filter byte 0 = None, 0 = black, 255 = white).
  const scanlines: Buffer[] = [];
  for (let y = 0; y < pixelsPerSide; y++) {
    scanlines.push(Buffer.from([0]));
    const row = Buffer.alloc(pixelsPerSide, 255);
    const my = Math.floor(y / cellSize) - margin;
    for (let x = 0; x < pixelsPerSide; x++) {
      const mx = Math.floor(x / cellSize) - margin;
      if (
        mx >= 0 &&
        mx < moduleCount &&
        my >= 0 &&
        my < moduleCount &&
        qr.isDark(my, mx)
      ) {
        row[x] = 0;
      }
    }
    scanlines.push(row);
  }

  const idat = deflateSync(Buffer.concat(scanlines));

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(pixelsPerSide, 0); // width
  ihdr.writeUInt32BE(pixelsPerSide, 4); // height
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(0, 9); // color type: grayscale
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace: none

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
