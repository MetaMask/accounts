/* eslint-disable no-restricted-globals -- Buffer is required for PNG decoding. */
/* eslint-disable no-bitwise -- PNG de-filtering, CRC-32, and pixel packing require bitwise ops. */
/* eslint-disable import-x/no-nodejs-modules -- zlib and fs are required for PNG decoding. */
/* eslint-disable id-length -- Single-letter x/y/pixel loop variables are idiomatic in image code. */
/* eslint-disable @typescript-eslint/no-non-null-assertion -- CRC table index and readByte indices are provably in range. */

import {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';
import { inflateSync } from 'zlib';

import { FragmentDecoder } from '../codec/decoder';
import type { SerializedUR } from '../core/ur-synth';

/** Bytes-per-pixel for each supported PNG 8-bit color type. */
const BYTES_PER_PIXEL_BY_COLOR_TYPE: Record<number, number> = {
  0: 1, // grayscale
  2: 3, // RGB
  3: 1, // indexed
  4: 2, // grayscale + alpha
  6: 4, // RGBA
};

/** Decoded RGB image: width, height, and packed ARGB pixels (0xFFRRGGBB). */
type DecodedImage = {
  width: number;
  height: number;
  /** Packed ARGB pixels, one Int32 per pixel. */
  data: Int32Array;
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

// Precomputed CRC-32 table (PNG uses the standard IEEE polynomial). No CRC
// dependency exists in package.json, so this is a small local implementation.
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
 * Compute the CRC-32 of a buffer (PNG chunk checksum, per the PNG spec).
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
 * Paeth predictor used in PNG filtering.
 *
 * @param a - Left pixel.
 * @param b - Up pixel.
 * @param c - Up-left pixel.
 * @returns The predicted byte value.
 */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) {
    return a;
  }
  if (pb <= pc) {
    return b;
  }
  return c;
}

/**
 * Minimal, dependency-free PNG decoder that handles the 8-bit colour types
 * produced by `qrcode-generator` and by Playwright screenshots (grayscale,
 * RGB, RGBA, and indexed). This avoids pulling in a native image dependency.
 *
 * @param png - A PNG-encoded Buffer.
 * @returns The decoded image as packed ARGB pixels.
 * @throws If the buffer is not a valid 8-bit PNG.
 */
export function decodePngToRgb(png: Buffer): DecodedImage {
  if (!png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('Not a PNG: invalid signature');
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];
  const palette: number[][] = [];

  while (offset < png.length) {
    // A chunk header is 8 bytes (4 length + 4 type); a full chunk adds the
    // data length and a 4-byte trailing CRC.
    if (offset + 8 > png.length) {
      throw new Error(
        `Corrupt PNG: truncated chunk header at offset ${String(offset)}`,
      );
    }
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (offset + 12 + length > png.length) {
      throw new Error(
        `Corrupt PNG: chunk '${type}' of length ${String(length)} extends past end of buffer`,
      );
    }
    const data = png.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = png.readUInt32BE(offset + 8 + length);
    const actualCrc = crc32(png.subarray(offset + 4, offset + 8 + length));
    if (actualCrc !== expectedCrc) {
      throw new Error(
        `Corrupt PNG: CRC mismatch in '${type}' chunk at offset ${String(offset)} (expected 0x${expectedCrc.toString(16)}, got 0x${actualCrc.toString(16)})`,
      );
    }
    offset += 8 + length + 4; // length + type + data + CRC

    switch (type) {
      case 'IHDR':
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data.readUInt8(8);
        colorType = data.readUInt8(9);
        break;
      case 'PLTE':
        for (let i = 0; i < data.length; i += 3) {
          palette.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
        }
        break;
      case 'IDAT':
        idatChunks.push(Buffer.from(data));
        break;
      case 'IEND':
        break;
      default:
        // Ignore ancillary chunks (tEXt, pHYs, etc.)
        break;
    }
  }

  if (bitDepth !== 8) {
    throw new Error(
      `Unsupported PNG bit depth: ${bitDepth} (only 8-bit is supported)`,
    );
  }

  const bytesPerPixel = BYTES_PER_PIXEL_BY_COLOR_TYPE[colorType] ?? 0;
  if (bytesPerPixel === 0) {
    throw new Error(`Unsupported PNG color type: ${colorType}`);
  }

  const inflated = inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const expectedInflatedLength = height * (stride + 1);
  if (inflated.length !== expectedInflatedLength) {
    // A truncated IDAT stream would otherwise inflate "successfully" and be
    // silently padded with zeroes by readByte, decoding into garbage pixels.
    throw new Error(
      `Corrupt PNG: inflated IDAT stream is ${String(inflated.length)} bytes, expected ${String(expectedInflatedLength)} (${String(height)} rows × (${String(stride)} + 1) bytes)`,
    );
  }
  const raw = Buffer.alloc(stride * height);

  /**
   * Read a byte from `inflated`. The length assertion above guarantees the
   * index is in range.
   *
   * @param idx - The byte index to read.
   * @returns The byte value.
   */
  const readByte = (idx: number): number => inflated[idx]!;

  let inIdx = 0;
  let outIdx = 0;
  for (let y = 0; y < height; y++) {
    const filter = readByte(inIdx);
    inIdx += 1;
    for (let x = 0; x < stride; x++) {
      const filtByte = readByte(inIdx);
      inIdx += 1;
      const leftIdx = x >= bytesPerPixel ? outIdx - bytesPerPixel : -1;
      const upIdx = y > 0 ? outIdx - stride : -1;
      const upLeftIdx =
        x >= bytesPerPixel && y > 0 ? outIdx - stride - bytesPerPixel : -1;
      const left = leftIdx >= 0 ? (raw[leftIdx] ?? 0) : 0;
      const up = upIdx >= 0 ? (raw[upIdx] ?? 0) : 0;
      const upLeft = upLeftIdx >= 0 ? (raw[upLeftIdx] ?? 0) : 0;

      let recon: number;
      switch (filter) {
        case 0: // None
          recon = filtByte;
          break;
        case 1: // Sub
          recon = (filtByte + left) & 0xff;
          break;
        case 2: // Up
          recon = (filtByte + up) & 0xff;
          break;
        case 3: // Average
          recon = (filtByte + ((left + up) >> 1)) & 0xff;
          break;
        case 4: // Paeth
          recon = (filtByte + paethPredictor(left, up, upLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unknown PNG filter type: ${filter}`);
      }
      raw[outIdx] = recon;
      outIdx += 1;
    }
  }

  const data = new Int32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const p = i * bytesPerPixel;
    let r = 0;
    let g = 0;
    let b = 0;
    switch (colorType) {
      case 0: // grayscale
        r = raw[p] ?? 0;
        g = r;
        b = r;
        break;
      case 2: // RGB
        r = raw[p] ?? 0;
        g = raw[p + 1] ?? 0;
        b = raw[p + 2] ?? 0;
        break;
      case 3: // indexed
        {
          const entry = palette[raw[p] ?? 0] ?? [];
          r = entry[0] ?? 0;
          g = entry[1] ?? 0;
          b = entry[2] ?? 0;
        }
        break;
      case 4: // grayscale + alpha
        r = raw[p] ?? 0;
        g = r;
        b = r;
        break;
      case 6: // RGBA
        r = raw[p] ?? 0;
        g = raw[p + 1] ?? 0;
        b = raw[p + 2] ?? 0;
        break;
      default:
        break;
    }
    data[i] = (0xff << 24) | (r << 16) | (g << 8) | b;
  }

  return { width, height, data };
}

/**
 * Decode a single QR PNG buffer back into its fragment string using
 * `@zxing/library`'s luminance + binarizer + QR reader pipeline.
 *
 * @param png - A PNG buffer containing a QR code.
 * @returns The decoded fragment string, or `null` if no QR code was found.
 */
export async function decodeQrImage(png: Buffer): Promise<string | null> {
  const { width, height, data } = decodePngToRgb(png);
  const source = new RGBLuminanceSource(data, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  try {
    const result = new QRCodeReader().decode(bitmap);
    return result.getText();
  } catch {
    return null;
  }
}

/** Options for {@link decodeQrScreenshots}. */
export type DecodeQrScreenshotsOptions = {
  /**
   * Optional debug sink. Invoked when a frame decodes to a QR code but the
   * BC-UR fountain decoder rejects it as an invalid fragment (e.g. an
   * unrelated QR captured in the frame). Invalid fragments remain tolerated;
   * this only makes the rejection observable instead of silently swallowed.
   */
  onLog?: (message: string) => void;
};

/**
 * Decode a sequence of QR-code PNG screenshots (captured from an animated QR,
 * e.g. via Playwright's `locator.screenshot()`) into the original SerializedUR.
 *
 * Fragments are accumulated through a BC-UR fountain decoder and may arrive in
 * any order.
 *
 * @param pathsOrBuffers - Either filesystem paths to PNG files, or PNG buffers.
 * For string entries, the file is read from disk.
 * @param options - Optional decoding options (e.g. a debug `onLog` sink).
 * @returns The reconstructed SerializedUR.
 * @throws If the fragments are insufficient to reconstruct the UR.
 */
export async function decodeQrScreenshots(
  pathsOrBuffers: (string | Buffer)[],
  options: DecodeQrScreenshotsOptions = {},
): Promise<SerializedUR> {
  const { readFile } = await import('node:fs/promises');
  const decoder = new FragmentDecoder();

  for (const entry of pathsOrBuffers) {
    const png = typeof entry === 'string' ? await readFile(entry) : entry;
    const fragment = await decodeQrImage(png);
    if (fragment !== null) {
      // Tolerate frames that decode to a QR but are not valid BC-UR fragments
      // (e.g. noise, partial reads, or an unrelated QR in the frame). The
      // rejection is surfaced through the optional debug sink so real bugs
      // are not silently hidden.
      try {
        decoder.receivePart(fragment);
      } catch (error) {
        options.onLog?.(
          `Rejected invalid BC-UR fragment: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    if (decoder.isComplete()) {
      break;
    }
  }

  if (!decoder.isComplete()) {
    throw new Error(
      'QR screenshot decoding incomplete: insufficient fragments',
    );
  }
  if (!decoder.isSuccess()) {
    throw new Error('QR screenshot decoding failed: reconstruction error');
  }
  return decoder.resultUR();
}
