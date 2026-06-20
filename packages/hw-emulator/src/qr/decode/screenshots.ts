/* eslint-disable no-restricted-globals -- Buffer is required for PNG decoding. */
/* eslint-disable no-bitwise -- PNG de-filtering and pixel packing require bitwise ops. */
/* eslint-disable import-x/no-nodejs-modules -- zlib and fs are required for PNG decoding. */
/* eslint-disable id-length -- Single-letter x/y/pixel loop variables are idiomatic in image code. */

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
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
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
  const raw = Buffer.alloc(stride * height);

  /**
   * Read a byte from `inflated`, treating out-of-range as 0.
   *
   * @param idx - The byte index to read.
   * @returns The byte value, or 0 if out of range.
   */
  const readByte = (idx: number): number => inflated[idx] ?? 0;

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

/**
 * Decode a sequence of QR-code PNG screenshots (captured from an animated QR,
 * e.g. via Playwright's `locator.screenshot()`) into the original SerializedUR.
 *
 * Fragments are accumulated through a BC-UR fountain decoder and may arrive in
 * any order.
 *
 * @param pathsOrBuffers - Either filesystem paths to PNG files, or PNG buffers.
 * For string entries, the file is read from disk.
 * @returns The reconstructed SerializedUR.
 * @throws If the fragments are insufficient to reconstruct the UR.
 */
export async function decodeQrScreenshots(
  pathsOrBuffers: (string | Buffer)[],
): Promise<SerializedUR> {
  const { readFile } = await import('node:fs/promises');
  const decoder = new FragmentDecoder();

  for (const entry of pathsOrBuffers) {
    const png = typeof entry === 'string' ? await readFile(entry) : entry;
    const fragment = await decodeQrImage(png);
    if (fragment !== null) {
      // Tolerate frames that decode to a QR but are not valid BC-UR fragments
      // (e.g. noise, partial reads, or an unrelated QR in the frame). Mirrors
      // the spike's per-frame try/catch around `decoder.receivePart`.
      try {
        decoder.receivePart(fragment);
      } catch {
        // Ignore invalid fragments; the fountain decoder keeps accumulating.
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
  return decoder.resultUR();
}
