import { UR, URDecoder } from '@ngraveio/bc-ur';

import type { SerializedUR } from '../core/ur-synth';

/**
 * Normalise a fragment string to lowercase. BC-UR fragments are
 * case-insensitive at the encoding layer, but MetaMask uppercases the rendered
 * QR value (see `player.js`), so decoded fragments from a real screenshot are
 * uppercase. Normalising here keeps the decoder agnostic to that.
 *
 * @param part - A BC-UR fragment string.
 * @returns The lowercased fragment.
 */
function normalizePart(part: string): string {
  return part.toLowerCase();
}

/**
 * Accumulator for BC-UR fountain fragments. Accepts fragments in any order and
 * exposes completion state.
 */
export class FragmentDecoder {
  readonly #decoder: URDecoder;

  constructor() {
    this.#decoder = new URDecoder();
  }

  /**
   * Feed a single fragment to the fountain decoder.
   *
   * @param part - A BC-UR fragment string (any case).
   * @returns `true` if the fragment was accepted as new information.
   */
  receivePart(part: string): boolean {
    return this.#decoder.receivePart(normalizePart(part));
  }

  /**
   * Whether enough fragments have been received to reconstruct the UR.
   *
   * @returns `true` once the fountain decoder has enough fragments.
   */
  isComplete(): boolean {
    return Boolean(this.#decoder.isComplete());
  }

  /**
   * Whether decoding completed successfully.
   *
   * @returns `true` if decoding succeeded.
   */
  isSuccess(): boolean {
    return Boolean(this.#decoder.isSuccess());
  }

  /**
   * Estimated completion in the range [0, 1].
   *
   * @returns The completion fraction.
   */
  getProgress(): number {
    return this.#decoder.getProgress();
  }

  /**
   * Reconstruct the SerializedUR once complete.
   *
   * @returns The reconstructed SerializedUR.
   * @throws If decoding is not yet complete or failed.
   */
  resultUR(): SerializedUR {
    const ur: UR = this.#decoder.resultUR();
    return { type: ur.type, cbor: ur.cbor.toString('hex') };
  }
}

/**
 * Decode a list of BC-UR fragments (in any order) into a SerializedUR.
 *
 * @param parts - Fragment strings.
 * @returns The reconstructed SerializedUR.
 * @throws If the fragments are insufficient or invalid.
 */
export function decodeFragments(parts: string[]): SerializedUR {
  const decoder = new FragmentDecoder();
  for (const part of parts) {
    decoder.receivePart(part);
  }
  if (!decoder.isComplete()) {
    throw new Error(
      'BC-UR decoding incomplete: insufficient or invalid fragments',
    );
  }
  return decoder.resultUR();
}
