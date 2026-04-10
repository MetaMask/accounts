import { generateEthAccountId } from './account-id';

const MOCK_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

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
    const other = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    expect(generateEthAccountId(MOCK_ADDRESS)).not.toBe(
      generateEthAccountId(other),
    );
  });

  it('normalizes checksum-cased and lowercase addresses to the same ID', () => {
    const checksummed = '0x1234567890AbCdEf1234567890aBcDeF12345678';

    expect(generateEthAccountId(checksummed)).toBe(
      generateEthAccountId(MOCK_ADDRESS),
    );
  });
});
