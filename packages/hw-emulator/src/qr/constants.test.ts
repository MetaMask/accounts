import { getChecksumAddress } from '@metamask/utils';

import {
  QR_CODE_SIZE_PX,
  QR_EMULATOR_ACCOUNT_DERIVATION_PATH,
  QR_EMULATOR_ACCOUNT_PATH,
  QR_EMULATOR_ADDRESS,
  QR_EMULATOR_CHILDREN_PATH,
  QR_EMULATOR_DEFAULT_XFP,
  QR_EMULATOR_FIRST_ADDRESS_PATH,
  QR_EMULATOR_ROOT_DERIVATION_PATH,
  QR_EMULATOR_SEED,
  QR_FRAGMENT_SIZE,
  QR_REFRESH_MS,
  QR_UPPERCASE,
  deriveAddressFromSeed,
} from './constants';

describe('QR emulator constants', () => {
  describe('seed and derivation paths', () => {
    it('exposes a 12-word BIP-39 seed', () => {
      expect(QR_EMULATOR_SEED.split(' ')).toHaveLength(12);
    });

    it('exposes the canonical live-chain root path', () => {
      expect(QR_EMULATOR_ROOT_DERIVATION_PATH).toBe("m/44'/60'");
    });

    it('exposes the account path component and full account path', () => {
      expect(QR_EMULATOR_ACCOUNT_PATH).toBe("0'");
      expect(QR_EMULATOR_ACCOUNT_DERIVATION_PATH).toBe("m/44'/60'/0'");
    });

    it('exposes the children path matching the QR keyring default', () => {
      expect(QR_EMULATOR_CHILDREN_PATH).toBe('0/*');
    });

    it('exposes the first-address full derivation path', () => {
      expect(QR_EMULATOR_FIRST_ADDRESS_PATH).toBe("m/44'/60'/0'/0/0");
    });

    it('exposes a 0x-prefixed device fingerprint', () => {
      expect(QR_EMULATOR_DEFAULT_XFP).toBe('0xdeadbeef');
    });
  });

  describe('QR_EMULATOR_ADDRESS', () => {
    it('derives the canonical hardhat address #0 for the default seed', () => {
      expect(QR_EMULATOR_ADDRESS).toBe(
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      );
    });

    it('is the checksum-encoded first derived address', () => {
      expect(QR_EMULATOR_ADDRESS).toBe(getChecksumAddress(QR_EMULATOR_ADDRESS));
    });

    it('matches a fresh derivation from the seed', () => {
      expect(
        deriveAddressFromSeed(QR_EMULATOR_SEED, QR_EMULATOR_FIRST_ADDRESS_PATH),
      ).toBe(QR_EMULATOR_ADDRESS);
    });

    it('derives a different address at index 1', () => {
      expect(deriveAddressFromSeed(QR_EMULATOR_SEED, "m/44'/60'/0'/0/1")).toBe(
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      );
    });
  });

  describe('codec/rendering constants (mirror player.js)', () => {
    it('uses fragment size 200', () => {
      expect(QR_FRAGMENT_SIZE).toBe(200);
    });

    it('refreshes every 200 ms (5 fps)', () => {
      expect(QR_REFRESH_MS).toBe(200);
    });

    it('renders QR codes at 225 px', () => {
      expect(QR_CODE_SIZE_PX).toBe(225);
    });

    it('uppercases fragment strings before encoding', () => {
      expect(QR_UPPERCASE).toBe(true);
    });
  });
});
