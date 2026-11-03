/* eslint-disable no-restricted-globals -- Buffer is required for UR reconstruction. */

import { UR, UREncoder } from '@ngraveio/bc-ur';

import { QR_FRAGMENT_SIZE } from '../constants';
import type { SerializedUR } from '../core/ur-synth';

/**
 * Reconstruct a `@ngraveio/bc-ur` {@link UR} from a SerializedUR.
 *
 * @param ur - The SerializedUR (type + hex cbor).
 * @returns A bc-ur UR instance.
 */
export function toRegistryUR(ur: SerializedUR): UR {
  return new UR(Buffer.from(ur.cbor, 'hex'), ur.type);
}

/**
 * Encode a SerializedUR into the complete list of BC-UR fountain fragments.
 *
 * @param ur - The SerializedUR to encode.
 * @param fragmentSize - Maximum fragment length in bytes (defaults to
 * `QR_FRAGMENT_SIZE`, mirroring MetaMask's `player.js`).
 * @returns The ordered list of fragment strings (`ur:<type>/...`).
 */
export function encodeToFragments(
  ur: SerializedUR,
  fragmentSize: number = QR_FRAGMENT_SIZE,
): string[] {
  return new UREncoder(toRegistryUR(ur), fragmentSize).encodeWhole();
}

/**
 * Build a stateful BC-UR encoder that yields one fragment at a time, mirroring
 * the way MetaMask's `player.js` animates a sign-request QR.
 *
 * @param ur - The SerializedUR to encode.
 * @param fragmentSize - Maximum fragment length in bytes.
 * @returns An object with a `nextPart()` method.
 */
export function createEncoder(
  ur: SerializedUR,
  fragmentSize: number = QR_FRAGMENT_SIZE,
): {
  nextPart: () => string;
  fragmentsLength: number;
} {
  const encoder = new UREncoder(toRegistryUR(ur), fragmentSize);
  return {
    nextPart: () => encoder.nextPart(),
    fragmentsLength: encoder.fragmentsLength,
  };
}
