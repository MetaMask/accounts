import { CryptoAccount, CryptoHDKey } from '@keystonehq/bc-ur-registry-eth';

import {
  createCryptoAccount,
  createCryptoHDKey,
  createCryptoOutput,
  createKeypath,
  parseXfp,
  pathToComponents,
} from './registry';

describe('QR registry helpers', () => {
  describe('parseXfp', () => {
    it('parses a 0x-prefixed fingerprint into a 4-byte buffer', () => {
      expect(parseXfp('0xdeadbeef')).toStrictEqual(
        Buffer.from('deadbeef', 'hex'),
      );
    });

    it('parses a bare hex fingerprint', () => {
      expect(parseXfp('deadbeef')).toStrictEqual(
        Buffer.from('deadbeef', 'hex'),
      );
    });
  });

  describe('pathToComponents', () => {
    it('parses a hardened path', () => {
      const components = pathToComponents("44'/60'/0'/0/0");
      expect(components).toHaveLength(5);
      expect(components[0]?.isHardened()).toBe(true);
      expect(components[0]?.getIndex()).toBe(44);
      expect(components[3]?.isHardened()).toBe(false);
      expect(components[3]?.getIndex()).toBe(0);
    });

    it('handles a leading m/ or M/', () => {
      expect(pathToComponents("m/44'/60'")).toHaveLength(2);
      expect(pathToComponents("M/44'/60'")).toHaveLength(2);
    });

    it('handles a wildcard component', () => {
      const components = pathToComponents('0/*');
      expect(components[0]?.getIndex()).toBe(0);
      expect(components[1]?.isWildcard()).toBe(true);
    });
  });

  describe('createKeypath', () => {
    it('round-trips its path through getPath', () => {
      const keypath = createKeypath("44'/60'/0'/0/0");
      expect(keypath.getPath()).toBe("44'/60'/0'/0/0");
    });

    it('round-trips a wildcard children path', () => {
      const keypath = createKeypath('0/*');
      expect(keypath.getPath()).toBe('0/*');
    });
  });

  describe('createCryptoHDKey', () => {
    it('constructs a CryptoHDKey with the expected accessors', () => {
      const hdKey = createCryptoHDKey({
        publicKey: Buffer.alloc(33, 0x02),
        chainCode: Buffer.alloc(32, 0x03),
        originPath: "44'/60'/0'",
        sourceFingerprint: parseXfp('0xdeadbeef'),
        childrenPath: '0/*',
        name: 'Keystone Test',
        note: 'Account #0',
      });

      expect(hdKey).toBeInstanceOf(CryptoHDKey);
      expect(hdKey.getOrigin()?.getPath()).toBe("44'/60'/0'");
      expect(hdKey.getChildren()?.getPath()).toBe('0/*');
      expect(hdKey.getName()).toBe('Keystone Test');
      expect(hdKey.getNote()).toBe('Account #0');
      expect(hdKey.getKey().equals(Buffer.alloc(33, 0x02))).toBe(true);
      expect(hdKey.getChainCode().equals(Buffer.alloc(32, 0x03))).toBe(true);
    });

    it('produces a round-trippable CBOR encoding', () => {
      const hdKey = createCryptoHDKey({
        publicKey: Buffer.alloc(33, 0x02),
        chainCode: Buffer.alloc(32, 0x03),
        originPath: "44'/60'/0'",
        sourceFingerprint: parseXfp('0xdeadbeef'),
        childrenPath: '0/*',
      });
      const redecoded = CryptoHDKey.fromCBOR(hdKey.toCBOR());
      expect(redecoded.getOrigin()?.getPath()).toBe("44'/60'/0'");
      expect(redecoded.getChildren()?.getPath()).toBe('0/*');
    });
  });

  describe('createCryptoOutput / createCryptoAccount', () => {
    it('wraps an HD key and bundles descriptors into an account', () => {
      const hdKey = createCryptoHDKey({
        publicKey: Buffer.alloc(33, 0x02),
        chainCode: Buffer.alloc(32, 0x03),
        originPath: "44'/60'/0'",
        sourceFingerprint: parseXfp('0xdeadbeef'),
      });
      const output = createCryptoOutput(hdKey);
      expect(output.getHDKey()).toBe(hdKey);

      const account = createCryptoAccount(parseXfp('0xdeadbeef'), [output]);
      expect(account).toBeInstanceOf(CryptoAccount);
      expect(account.getOutputDescriptors()).toHaveLength(1);
      expect(account.getMasterFingerprint().toString('hex')).toBe('deadbeef');
    });
  });
});
