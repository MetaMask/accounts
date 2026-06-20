import { URDecoder } from '@ngraveio/bc-ur';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from '../constants';
import { buildCryptoAccountUR, buildCryptoHDKeyUR } from '../core/ur-synth';
import type { SynthesizeOptions } from '../core/ur-synth';
import { FragmentDecoder, decodeFragments } from './decoder';
import { encodeToFragments } from './encoder';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-account',
  descriptorCount: 5,
};

describe('QR codec decoder', () => {
  describe('FragmentDecoder', () => {
    it('is not complete before receiving any fragments', () => {
      const decoder = new FragmentDecoder();
      expect(decoder.isComplete()).toBe(false);
      expect(decoder.isSuccess()).toBe(false);
    });

    it('accepts uppercase fragments (mirrors decoded screenshots from MM)', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragments = encodeToFragments(ur, 10_000);
      const decoder = new FragmentDecoder();
      // MM uppercases the rendered QR value; the decoder must accept that.
      const accepted = decoder.receivePart(
        fragments[0]?.toUpperCase() as string,
      );
      expect(accepted).toBe(true);
      expect(decoder.isComplete()).toBe(true);
      expect(decoder.resultUR()).toStrictEqual(ur);
    });

    it('reports monotonic progress as fragments arrive', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      const decoder = new FragmentDecoder();
      const start = decoder.getProgress();
      expect(start).toBe(0);
      for (const fragment of fragments) {
        decoder.receivePart(fragment);
        if (decoder.isComplete()) {
          break;
        }
      }
      expect(decoder.getProgress()).toBeGreaterThanOrEqual(start);
      expect(decoder.isComplete()).toBe(true);
    });

    it('is compatible with the raw bc-ur URDecoder on the same fragments', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragments = encodeToFragments(ur, 10_000);
      const raw = new URDecoder();
      for (const fragment of fragments) {
        raw.receivePart(fragment);
      }
      expect(raw.isComplete()).toBe(true);
    });
  });

  describe('decodeFragments', () => {
    it('round-trips an encoded crypto-account UR', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur);
      const decoded = decodeFragments(fragments);
      expect(decoded).toStrictEqual(ur);
    });

    it('round-trips an encoded crypto-hdkey UR', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragments = encodeToFragments(ur);
      expect(decodeFragments(fragments)).toStrictEqual(ur);
    });

    it('reconstructs the UR regardless of fragment order', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      // Shuffle deterministically (reverse is a sufficient order-independence
      // probe for a fountain code; interleaving is exercised too).
      const reversed = [...fragments].reverse();
      expect(decodeFragments(reversed)).toStrictEqual(ur);

      const interleaved = fragments
        .filter((_, i) => i % 2 === 0)
        .concat(fragments.filter((_, i) => i % 2 !== 0));
      expect(decodeFragments(interleaved)).toStrictEqual(ur);
    });

    it('throws when given insufficient fragments', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, 50);
      // Feed only the first fragment of a multi-fragment UR.
      expect(() => decodeFragments([fragments[0] as string])).toThrow(
        /incomplete/iu,
      );
    });

    it('tolerates a mix of complete and duplicate fragments', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragments = encodeToFragments(ur, 10_000);
      // Duplicate fragments are harmless to a fountain decoder.
      expect(decodeFragments([...fragments, ...fragments])).toStrictEqual(ur);
    });
  });
});
