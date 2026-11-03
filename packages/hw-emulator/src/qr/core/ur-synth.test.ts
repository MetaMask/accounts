import { publicToAddress } from '@ethereumjs/util';
import { CryptoAccount, CryptoHDKey } from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress } from '@metamask/utils';
import HdKey from 'hdkey';

import {
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_ADDRESS,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_SEED,
} from '../constants';
import {
  CRYPTO_ACCOUNT_TYPE,
  CRYPTO_HDKEY_TYPE,
  buildCryptoAccountUR,
  buildCryptoHDKeyUR,
  deriveAccountAddress,
  synthesizeAccountUR,
} from './ur-synth';
import type { SynthesizeOptions } from './ur-synth';

const baseOptions: SynthesizeOptions = {
  seed: QR_EMULATOR_SEED,
  accountPath: QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  childrenPath: QR_EMULATOR_CHILDREN_PATH,
  xfp: QR_EMULATOR_DEFAULT_XFP,
  deviceName: 'Keystone Test',
  pairMode: 'crypto-account',
  descriptorCount: 5,
};

function addressFromPublicKey(publicKey: Buffer): string {
  return getChecksumAddress(
    add0x(Buffer.from(publicToAddress(publicKey, true)).toString('hex')),
  );
}

describe('QR UR synthesizer', () => {
  describe('crypto-account mode (default)', () => {
    it('produces a SerializedUR with type crypto-account', () => {
      const ur = synthesizeAccountUR(baseOptions);
      expect(ur.type).toBe(CRYPTO_ACCOUNT_TYPE);
      expect(typeof ur.cbor).toBe('string');
      expect(ur.cbor.length).toBeGreaterThan(0);
    });

    it('decodes to a CryptoAccount whose first descriptor matches QR_EMULATOR_ADDRESS', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const account = CryptoAccount.fromCBOR(Buffer.from(ur.cbor, 'hex'));
      expect(account).toBeInstanceOf(CryptoAccount);

      const descriptors = account.getOutputDescriptors();
      expect(descriptors).toHaveLength(5);

      const firstHdKey = descriptors[0]?.getHDKey();
      expect(firstHdKey).toBeInstanceOf(CryptoHDKey);
      expect(addressFromPublicKey((firstHdKey as CryptoHDKey).getKey())).toBe(
        QR_EMULATOR_ADDRESS,
      );
    });

    it('derives distinct, ordered addresses across descriptors', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const account = CryptoAccount.fromCBOR(Buffer.from(ur.cbor, 'hex'));
      const addresses = account
        .getOutputDescriptors()
        .map((descriptor) =>
          addressFromPublicKey(descriptor.getHDKey().getKey()),
        );

      expect(addresses[0]).toBe(QR_EMULATOR_ADDRESS);
      for (let i = 0; i < addresses.length; i++) {
        expect(addresses[i]).toBe(
          deriveAccountAddress(
            QR_EMULATOR_SEED,
            QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
            i,
          ),
        );
      }
      expect(new Set(addresses).size).toBe(addresses.length);
    });

    it('emits the device fingerprint as the master fingerprint', () => {
      const ur = buildCryptoAccountUR(baseOptions);
      const account = CryptoAccount.fromCBOR(Buffer.from(ur.cbor, 'hex'));
      expect(account.getMasterFingerprint().toString('hex')).toBe('deadbeef');
    });
  });

  describe('crypto-hdkey mode', () => {
    it('produces a SerializedUR with type crypto-hdkey', () => {
      const ur = synthesizeAccountUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      expect(ur.type).toBe(CRYPTO_HDKEY_TYPE);
    });

    it('decodes to a CryptoHDKey whose xpub derives QR_EMULATOR_ADDRESS at 0/0', () => {
      const ur = buildCryptoHDKeyUR({
        ...baseOptions,
        pairMode: 'crypto-hdkey',
      });
      const hdKey = CryptoHDKey.fromCBOR(Buffer.from(ur.cbor, 'hex'));

      expect(hdKey.getOrigin()?.getPath()).toBe("44'/60'/0'");
      expect(hdKey.getChildren()?.getPath()).toBe('0/*');

      const child = HdKey.fromExtendedKey(hdKey.getBip32Key()).derive('m/0/0');
      expect(addressFromPublicKey(child.publicKey)).toBe(QR_EMULATOR_ADDRESS);
    });
  });

  describe('determinism', () => {
    it('produces identical output across instances with the same seed', () => {
      const a = synthesizeAccountUR(baseOptions);
      const b = synthesizeAccountUR({ ...baseOptions });
      expect(a).toStrictEqual(b);
    });

    it('produces different output for a different seed', () => {
      const a = synthesizeAccountUR(baseOptions);
      const b = synthesizeAccountUR({
        ...baseOptions,
        seed: 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
      });
      expect(a.cbor).not.toBe(b.cbor);
    });
  });
});
