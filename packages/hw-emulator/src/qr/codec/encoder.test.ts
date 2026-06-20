import { UR } from '@ngraveio/bc-ur';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
  QR_FRAGMENT_SIZE,
} from '../constants';
import { buildCryptoAccountUR, buildCryptoHDKeyUR } from '../core/ur-synth';
import type { SynthesizeOptions } from '../core/ur-synth';
import { createEncoder, encodeToFragments, toRegistryUR } from './encoder';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-account',
  descriptorCount: 5,
};

describe('QR codec encoder', () => {
  describe('encodeToFragments', () => {
    it('produces fragment strings that start with the ur: scheme', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur);
      expect(fragments.length).toBeGreaterThan(0);
      for (const fragment of fragments) {
        expect(typeof fragment).toBe('string');
        expect(fragment.toLowerCase().startsWith('ur:')).toBe(true);
      }
    });

    it('emits fragments tagged with the crypto-account type', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur);
      expect(fragments[0]?.toLowerCase().startsWith('ur:crypto-account/')).toBe(
        true,
      );
    });

    it('fits a small payload in a single fragment when fragmentSize is large', () => {
      // A single crypto-hdkey is small relative to a generous fragment size.
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const fragments = encodeToFragments(ur, 10_000);
      expect(fragments).toHaveLength(1);
    });

    it('scales fragment count with payload size', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const smallFragmentSize = 50;
      const largeFragmentSize = 2_000;

      const many = encodeToFragments(ur, smallFragmentSize);
      const few = encodeToFragments(ur, largeFragmentSize);

      expect(many.length).toBeGreaterThan(few.length);
      expect(few.length).toBeGreaterThanOrEqual(1);
    });

    it('produces more fragments than one for the default 200-byte size on a 5-descriptor account', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const fragments = encodeToFragments(ur, QR_FRAGMENT_SIZE);
      expect(fragments.length).toBeGreaterThan(1);
    });

    it('is deterministic: same UR and fragmentSize yield the same fragment sequence', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const a = encodeToFragments(ur);
      const b = encodeToFragments(ur);
      expect(a).toStrictEqual(b);
    });
  });

  describe('createEncoder', () => {
    it('yields fragments one at a time via nextPart', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const encoder = createEncoder(ur);
      const whole = encodeToFragments(ur);

      expect(encoder.fragmentsLength).toBe(whole.length);
      const yielded = Array.from({ length: encoder.fragmentsLength }, () =>
        encoder.nextPart(),
      );
      expect(yielded).toStrictEqual(whole);
      for (const fragment of yielded) {
        expect(fragment.toLowerCase().startsWith('ur:')).toBe(true);
      }
    });
  });

  describe('toRegistryUR', () => {
    it('reconstructs a bc-ur UR with the expected type and cbor', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const registryUR = toRegistryUR(ur);
      expect(registryUR).toBeInstanceOf(UR);
      expect(registryUR.type).toBe(ur.type);
      expect(registryUR.cbor.toString('hex')).toBe(ur.cbor);
    });
  });
});
