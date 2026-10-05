import { bytesToHex, hexToBytes } from '@metamask/utils';
import { sha256 } from '@noble/hashes/sha2';
import { v4 as uuidv4 } from 'uuid';

import {
  generateEthAccountId,
  generateEthAccountIdUnmemoized,
  getDeterministicUuidV4,
  getDeterministicUuidV4Random,
  getDeterministicUuidV4Unmemoized,
} from './account-id';

jest.mock('@noble/hashes/sha2', () => ({
  ...jest.requireActual('@noble/hashes/sha2'),
  sha256: jest.fn(),
}));

const { sha256: actualSha256 } =
  jest.requireActual<typeof import('@noble/hashes/sha2')>('@noble/hashes/sha2');

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const CHECKSUMMED_ADDRESS = '0x1234567890AbCdEf1234567890aBcDeF12345678';
const OTHER_ADDRESS = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const MOCK_ACCOUNT_ID = 'fbab1483-6973-4403-af3c-4e90682ac261';
const MOCK_RANDOM = '0xfbab148369735403af3c4e90682ac261';
// Inputs used only by the memoization test, to guarantee cache misses.
const UNIQUE_INPUT_A = `0x${'11'.repeat(20)}`;
const UNIQUE_INPUT_B = `0x${'22'.repeat(20)}`;

describe('account-id', () => {
  beforeEach(() => {
    // The shared Jest config enables `resetMocks`, which strips mock
    // implementations before every test, so the real implementation is
    // restored here.
    jest.mocked(sha256).mockImplementation(actualSha256);
  });

  describe('generateEthAccountId', () => {
    it('returns a UUID v4 string', () => {
      const id = generateEthAccountId(MOCK_ADDRESS);

      expect(id).toMatch(
        /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/u,
      );
    });

    it('is deterministic for the same address', () => {
      expect(generateEthAccountId(MOCK_ADDRESS)).toBe(
        generateEthAccountId(MOCK_ADDRESS),
      );
    });

    it('produces different IDs for different addresses', () => {
      expect(generateEthAccountId(MOCK_ADDRESS)).not.toBe(
        generateEthAccountId(OTHER_ADDRESS),
      );
    });

    it('normalizes checksum-cased and lowercase addresses to the same ID', () => {
      expect(generateEthAccountId(CHECKSUMMED_ADDRESS)).toBe(
        generateEthAccountId(MOCK_ADDRESS),
      );
    });

    it('matches the known account ID for the mock address', () => {
      expect(generateEthAccountId(MOCK_ADDRESS)).toBe(MOCK_ACCOUNT_ID);
    });

    it('derives the same ID as the unmemoized version', () => {
      expect(generateEthAccountId(MOCK_ADDRESS)).toBe(
        generateEthAccountIdUnmemoized(MOCK_ADDRESS),
      );
    });
  });

  describe('getDeterministicUuidV4Random', () => {
    it('returns the first 16 bytes of the SHA-256 digest of the input', () => {
      const expected = sha256(hexToBytes(MOCK_ADDRESS)).slice(0, 16);

      expect(getDeterministicUuidV4Random(MOCK_ADDRESS)).toStrictEqual(
        expected,
      );
    });

    it('matches the known seed bytes for the mock address', () => {
      expect(bytesToHex(getDeterministicUuidV4Random(MOCK_ADDRESS))).toBe(
        MOCK_RANDOM,
      );
    });

    it('ignores hex casing, matching hexToBytes parsing', () => {
      expect(getDeterministicUuidV4Random(CHECKSUMMED_ADDRESS)).toStrictEqual(
        getDeterministicUuidV4Random(MOCK_ADDRESS),
      );
    });

    it('returns a fresh copy on every call', () => {
      const first = getDeterministicUuidV4Random(MOCK_ADDRESS);

      // The uuid package stamps the version and variant bits in place, so a
      // shared array would corrupt subsequent derivations.
      first[6] = 0xff;
      first[8] = 0xff;

      expect(getDeterministicUuidV4Random(MOCK_ADDRESS)).toStrictEqual(
        sha256(hexToBytes(MOCK_ADDRESS)).slice(0, 16),
      );
      expect(getDeterministicUuidV4Random(MOCK_ADDRESS)).not.toBe(first);
    });

    it('throws when the input is not a hex string', () => {
      expect(() => getDeterministicUuidV4Random('not-hex')).toThrow(
        'Value must be a hexadecimal string.',
      );
    });
  });

  describe('getDeterministicUuidV4', () => {
    it('derives the UUID from the SHA-256 digest of the raw input', () => {
      const expected = uuidv4({
        random: sha256(hexToBytes(MOCK_ADDRESS)).slice(0, 16),
      });

      expect(getDeterministicUuidV4(MOCK_ADDRESS)).toBe(expected);
    });

    it('matches the known UUID for the mock address', () => {
      expect(getDeterministicUuidV4(MOCK_ADDRESS)).toBe(MOCK_ACCOUNT_ID);
    });

    it('returns the same UUID for repeated calls', () => {
      expect(getDeterministicUuidV4(MOCK_ADDRESS)).toBe(
        getDeterministicUuidV4(MOCK_ADDRESS),
      );
    });

    it('produces different UUIDs for different inputs', () => {
      expect(getDeterministicUuidV4(MOCK_ADDRESS)).not.toBe(
        getDeterministicUuidV4(OTHER_ADDRESS),
      );
    });

    it('computes the SHA-256 digest at most once per distinct input', () => {
      getDeterministicUuidV4(UNIQUE_INPUT_A);
      getDeterministicUuidV4(UNIQUE_INPUT_A);
      getDeterministicUuidV4(UNIQUE_INPUT_A);
      getDeterministicUuidV4(UNIQUE_INPUT_B);

      expect(jest.mocked(sha256)).toHaveBeenCalledTimes(2);
    });

    it('derives the same UUID as uuid v4 seeded with the random bytes', () => {
      expect(
        uuidv4({ random: getDeterministicUuidV4Random(MOCK_ADDRESS) }),
      ).toBe(getDeterministicUuidV4(MOCK_ADDRESS));
    });

    it('derives the same UUID as the unmemoized version', () => {
      expect(getDeterministicUuidV4(MOCK_ADDRESS)).toBe(
        getDeterministicUuidV4Unmemoized(MOCK_ADDRESS),
      );
    });
  });
});
