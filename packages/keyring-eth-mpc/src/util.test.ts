import {
  ecsign,
  privateToAddress,
  privateToPublic,
  type ECDSASignature,
} from '@ethereumjs/util';
import {
  SignTypedDataVersion,
  TypedDataUtils,
  typedSignatureHash,
} from '@metamask/eth-sig-util';
import { bytesToHex, hexToBytes } from '@metamask/utils';

import {
  equalAddresses,
  generateSessionNonce,
  getSignedTypedDataHash,
  normalizeAddress,
  parseCustodians,
  parseDkls19Setup,
  parseEthSig,
  parseSelectedVerifierIndex,
  parseSignedTypedDataVersion,
  parseThresholdKeyId,
  parseVerifierIds,
  publicKeyToAddressHex,
  publicToAddressHex,
  toEthSig,
} from './util';

describe('util', () => {
  const privateKey = hexToBytes(
    '0x6969696969696969696969696969696969696969696969696969696969696969',
  );
  const publicKey = privateToPublic(privateKey);
  const address = bytesToHex(privateToAddress(privateKey));

  const SECP256K1_N = BigInt(
    '0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141',
  );
  const SECP256K1_HALF_N = SECP256K1_N / 2n;

  const toBytes32 = (value: bigint): Uint8Array => {
    return hexToBytes(`0x${value.toString(16).padStart(64, '0')}`);
  };

  const toCompactSignature = (signature: ECDSASignature): Uint8Array => {
    const compact = new Uint8Array(64);
    compact.set(signature.r, 0);
    compact.set(signature.s, 32);
    return compact;
  };

  const findSignatureByV = (
    targetV: bigint,
  ): { hash: Uint8Array; signature: ECDSASignature } => {
    for (let index = 0; index < 512; index += 1) {
      const hash = new Uint8Array(32);
      hash[31] = index;
      const signature = ecsign(hash, privateKey);
      if (signature.v === targetV) {
        return { hash, signature };
      }
    }

    throw new Error(`Could not find signature with v=${targetV.toString()}`);
  };

  it('generates a session nonce from RNG bytes', () => {
    const bytes = new Uint8Array(32).fill(1);
    const rng = { generateRandomBytes: jest.fn().mockReturnValue(bytes) };

    expect(generateSessionNonce(rng)).toBe(bytesToHex(bytes));
    expect(rng.generateRandomBytes).toHaveBeenCalledWith(32);
  });

  it('converts public keys to address hex', () => {
    expect(publicToAddressHex(publicKey)).toBe(address);
    expect(publicKeyToAddressHex(publicKey)).toBe(address);
  });

  it('normalizes and compares addresses', () => {
    expect(normalizeAddress('0x1111111111111111111111111111111111111111')).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(
      equalAddresses(
        '0x1111111111111111111111111111111111111111',
        '0x1111111111111111111111111111111111111111',
      ),
    ).toBe(true);
    expect(
      equalAddresses(
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
      ),
    ).toBe(false);
  });

  it('converts compact signatures to ethereum signatures with both parities', () => {
    const sigWithParity0 = findSignatureByV(27n);
    const ethSignature0 = toEthSig(
      toCompactSignature(sigWithParity0.signature),
      sigWithParity0.hash,
      publicKey,
    );
    expect(ethSignature0).toHaveLength(65);
    expect(ethSignature0[64]).toBe(27);

    const sigWithParity1 = findSignatureByV(28n);
    const ethSignature1 = toEthSig(
      toCompactSignature(sigWithParity1.signature),
      sigWithParity1.hash,
      publicKey,
    );
    expect(ethSignature1).toHaveLength(65);
    expect(ethSignature1[64]).toBe(28);
  });

  it('enforces low-s for high-s compact signatures', () => {
    const { hash, signature } = findSignatureByV(27n);
    const highS = SECP256K1_N - BigInt(bytesToHex(signature.s));
    expect(highS).toBeGreaterThan(SECP256K1_HALF_N);

    const compactSignature = new Uint8Array(64);
    compactSignature.set(signature.r, 0);
    compactSignature.set(toBytes32(highS), 32);

    const ethSignature = toEthSig(compactSignature, hash, publicKey);
    const parsed = parseEthSig(ethSignature);
    const normalizedS = BigInt(bytesToHex(parsed.s));

    expect(ethSignature).toHaveLength(65);
    expect(normalizedS).toBeLessThanOrEqual(SECP256K1_HALF_N);
  });

  it('pads normalized s to 32 bytes when needed', () => {
    const { hash, signature } = findSignatureByV(27n);
    const compactSignature = new Uint8Array(64);
    compactSignature.set(signature.r, 0);
    compactSignature.set(toBytes32(SECP256K1_N - 1n), 32);

    const ethSignature = toEthSig(compactSignature, hash, publicKey);
    const parsed = parseEthSig(ethSignature);
    expect(parsed.s).toStrictEqual(toBytes32(1n));
  });

  it('falls back to parity=1 if public key recovery throws', () => {
    const signature = new Uint8Array(64);
    const invalidHash = new Uint8Array(32).fill(8);
    const ethSignature = toEthSig(signature, invalidHash, publicKey);
    expect(ethSignature).toHaveLength(65);
    expect(ethSignature[64]).toBe(28);
  });

  it('throws for invalid compact signature lengths', () => {
    expect(() =>
      toEthSig(new Uint8Array(63), new Uint8Array(32), new Uint8Array([4])),
    ).toThrow('Invalid signature length');
  });

  it('parses ethereum signatures and validates edge cases', () => {
    const signature = new Uint8Array(65).fill(1);
    signature[64] = 28;
    const parsed = parseEthSig(signature);
    expect(parsed.v).toBe(28n);
    expect(parsed.r).toHaveLength(32);
    expect(parsed.s).toHaveLength(32);

    expect(() => parseEthSig(new Uint8Array(64))).toThrow(
      'Invalid signature length',
    );

    const malformedSignature = {
      length: 65,
      64: undefined,
      slice: jest.fn().mockReturnValue(new Uint8Array(32)),
    } as unknown as Uint8Array;

    expect(() => parseEthSig(malformedSignature)).toThrow(
      'Invalid signature v value',
    );
  });

  it('parses signed typed data versions with sane defaults', () => {
    expect(parseSignedTypedDataVersion()).toBe(SignTypedDataVersion.V1);
    expect(parseSignedTypedDataVersion({ version: 'NOPE' })).toBe(
      SignTypedDataVersion.V1,
    );
    expect(
      parseSignedTypedDataVersion({ version: SignTypedDataVersion.V4 }),
    ).toBe(SignTypedDataVersion.V4);
  });

  it('hashes signed typed data for V1 and EIP-712 versions', () => {
    const typedDataV1 = [{ name: 'value', type: 'string', value: 'hello' }];

    const v1Hash = getSignedTypedDataHash(typedDataV1, SignTypedDataVersion.V1);
    expect(v1Hash).toStrictEqual(hexToBytes(typedSignatureHash(typedDataV1)));

    const typedDataV4 = {
      types: { EIP712Domain: [] },
      domain: {},
      primaryType: 'EIP712Domain',
      message: {},
    } as const;

    const v4Hash = getSignedTypedDataHash(
      typedDataV4 as never,
      SignTypedDataVersion.V4,
    );
    expect(v4Hash).toStrictEqual(
      new Uint8Array(
        TypedDataUtils.eip712Hash(typedDataV4 as never, SignTypedDataVersion.V4),
      ),
    );
  });

  it('parses and validates serialized keyring fields', () => {
    expect(parseThresholdKeyId('key-1')).toBe('key-1');
    expect(() => parseThresholdKeyId(1 as never)).toThrow('Invalid key ID');

    expect(parseVerifierIds(['v1', 'v2'])).toStrictEqual(['v1', 'v2']);
    expect(() => parseVerifierIds('v1' as never)).toThrow(
      'Invalid verifier IDs: expected an array',
    );
    expect(() => parseVerifierIds(['v1', 2] as never)).toThrow(
      'Invalid verifier ID: expected a string',
    );

    expect(parseSelectedVerifierIndex(0)).toBe(0);
    expect(() => parseSelectedVerifierIndex('0' as never)).toThrow(
      'Invalid selected verifier index: expected a number',
    );
    expect(() => parseSelectedVerifierIndex(-1)).toThrow(
      'Invalid selected verifier index: expected a non-negative integer',
    );
    expect(() => parseSelectedVerifierIndex(1.2)).toThrow(
      'Invalid selected verifier index: expected a non-negative integer',
    );
  });

  it('parses custodians and dkls19 setup fields', () => {
    expect(
      parseCustodians([
        { partyId: 'user-1', type: 'user' },
        { partyId: 'cloud-1', type: 'cloud' },
      ]),
    ).toStrictEqual([
      { partyId: 'user-1', type: 'user' },
      { partyId: 'cloud-1', type: 'cloud' },
    ]);

    expect(() => parseCustodians('nope' as never)).toThrow(
      'Invalid custodians: expected an array',
    );
    expect(() => parseCustodians([null] as never)).toThrow(
      'Invalid custodian: expected an object',
    );
    expect(() => parseCustodians([{ type: 'user' }] as never)).toThrow(
      'Invalid custodian partyId: expected a string',
    );
    expect(() =>
      parseCustodians([{ partyId: 'user-1', type: 'something-else' }] as never),
    ).toThrow("Invalid custodian type: expected 'user' or 'cloud'");

    expect(parseDkls19Setup('0x1234')).toStrictEqual(
      new Uint8Array([0x12, 0x34]),
    );
    expect(() => parseDkls19Setup(123 as never)).toThrow(
      'Invalid dkls19 setup: expected a string',
    );
  });
});
