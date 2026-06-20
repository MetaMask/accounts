import {
  BinaryBitmap,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} from '@zxing/library';

import { encodeToFragments } from '../codec/encoder';
import {
  QR_CODE_SIZE_PX,
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
  QR_UPPERCASE,
} from '../constants';
import { buildCryptoHDKeyUR } from '../core/ur-synth';
import type { SynthesizeOptions } from '../core/ur-synth';
import { decodePngToRgb } from '../decode/screenshots';
import { renderQrPng } from './png';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-hdkey',
  descriptorCount: 1,
};

// Decode a QR PNG buffer back to its text using @zxing/library directly.
function decodeWithZxing(png: Buffer): string {
  const { width, height, data } = decodePngToRgb(png);
  const source = new RGBLuminanceSource(data, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(source));
  return new QRCodeReader().decode(bitmap).getText();
}

describe('QR PNG renderer', () => {
  it('produces a PNG buffer with the expected signature', () => {
    const png = renderQrPng('ur:crypto-hdkey/oxttest');
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    expect(png[0]).toBe(0x89);
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.length).toBeGreaterThan(0);
  });

  it('renders at a size derived from QR_CODE_SIZE_PX', () => {
    const fragment = encodeToFragments(
      buildCryptoHDKeyUR(baseOptions),
      10_000,
    )[0] as string;
    const png = renderQrPng(fragment);
    const { width, height } = decodePngToRgb(png);
    // The renderer uses the largest integer cell multiple that fits within
    // QR_CODE_SIZE_PX; the result is always <= QR_CODE_SIZE_PX.
    expect(width).toBeLessThanOrEqual(QR_CODE_SIZE_PX);
    expect(height).toBeLessThanOrEqual(QR_CODE_SIZE_PX);
    expect(width).toBe(height);
  });

  it('round-trips: rendered fragment decodes back to the same (uppercased) value', () => {
    const fragment = encodeToFragments(
      buildCryptoHDKeyUR(baseOptions),
      10_000,
    )[0] as string;
    const png = renderQrPng(fragment);
    const decoded = decodeWithZxing(png);
    // The renderer uppercases the value (mirrors MM's player.js), so the
    // decoded text is the uppercased fragment.
    expect(decoded).toBe(QR_UPPERCASE ? fragment.toUpperCase() : fragment);
  });

  it('uppercases the encoded value to match MM player.js', () => {
    const pngLower = renderQrPng('ur:crypto-hdkey/lowercase-test');
    const pngUpper = renderQrPng('UR:CRYPTO-HDKEY/LOWERCASE-TEST');
    // Both render the same uppercase payload, so both decode to the same text.
    expect(decodeWithZxing(pngLower)).toBe(decodeWithZxing(pngUpper));
    expect(decodeWithZxing(pngLower).toUpperCase()).toBe(
      decodeWithZxing(pngLower),
    );
  });

  it('honours a custom target size', () => {
    const fragment = encodeToFragments(
      buildCryptoHDKeyUR(baseOptions),
      10_000,
    )[0] as string;
    const png = renderQrPng(fragment, 100);
    const { width, height } = decodePngToRgb(png);
    expect(width).toBeLessThanOrEqual(100);
    expect(height).toBeLessThanOrEqual(100);
  });
});
