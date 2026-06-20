/* eslint-disable no-restricted-globals -- Buffer is required for fingerprint/path encoding. */

import {
  CryptoAccount,
  CryptoHDKey,
  CryptoKeypath,
  CryptoOutput,
  PathComponent,
  ScriptExpressions,
} from '@keystonehq/bc-ur-registry-eth';

/**
 * Parse a device fingerprint string (e.g. `0xdeadbeef` or `deadbeef`) into a
 * 4-byte big-endian `Buffer`, the shape expected by the BC-UR registry.
 *
 * @param xfp - The hex-encoded fingerprint, optionally `0x`-prefixed.
 * @returns A 4-byte Buffer.
 */
export function parseXfp(xfp: string): Buffer {
  const hexPart = xfp.startsWith('0x') ? xfp.slice(2) : xfp;
  return Buffer.from(hexPart, 'hex');
}

/**
 * Parse a BIP-32 derivation path string (e.g. `m/44'/60'/0'/0/0` or
 * `0/*`) into the {@link PathComponent} list used by the BC-UR registry.
 *
 * Supports hardened suffixes (`'`) and wildcards (`*`).
 *
 * @param path - The derivation path, with or without a leading `m/` or `M/`.
 * @returns The ordered list of path components.
 */
export function pathToComponents(path: string): PathComponent[] {
  return path
    .replace(/^[mM]\//u, '')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => {
      if (segment === '*') {
        return new PathComponent({ hardened: false });
      }
      const hardened = segment.endsWith("'");
      const index = parseInt(hardened ? segment.slice(0, -1) : segment, 10);
      return new PathComponent({ index, hardened });
    });
}

/**
 * Build a {@link CryptoKeypath} (a BC-UR registry path) from a derivation path
 * string and an optional source fingerprint.
 *
 * @param path - The derivation path (e.g. `44'/60'/0'/0/0` or `0/*`).
 * @param sourceFingerprint - Optional 4-byte source fingerprint Buffer.
 * @returns A CryptoKeypath.
 */
export function createKeypath(
  path: string,
  sourceFingerprint?: Buffer,
): CryptoKeypath {
  return new CryptoKeypath(pathToComponents(path), sourceFingerprint);
}

type CryptoHDKeyOptions = {
  /** Compressed (33-byte) public key. */
  publicKey: Buffer;
  /** 32-byte chain code. */
  chainCode: Buffer;
  /** Origin path (e.g. `44'/60'/0'`). */
  originPath: string;
  /** 4-byte source fingerprint for the origin. */
  sourceFingerprint: Buffer;
  /** Optional children path (e.g. `0/*`). */
  childrenPath?: string;
  /** Optional human-readable name. */
  name?: string;
  /** Optional free-form note / keyring account label. */
  note?: string;
};

/**
 * Construct a {@link CryptoHDKey} (public-account form) suitable for use both as
 * a standalone `crypto-hdkey` UR and as an output descriptor inside a
 * `crypto-account` UR.
 *
 * @param options - Construction options.
 * @returns A CryptoHDKey.
 */
export function createCryptoHDKey(options: CryptoHDKeyOptions): CryptoHDKey {
  return new CryptoHDKey({
    isMaster: false,
    isPrivateKey: false,
    key: options.publicKey,
    chainCode: options.chainCode,
    origin: createKeypath(options.originPath, options.sourceFingerprint),
    ...(options.childrenPath
      ? { children: createKeypath(options.childrenPath) }
      : {}),
    ...(options.name === undefined ? {} : { name: options.name }),
    ...(options.note === undefined ? {} : { note: options.note }),
  });
}

/**
 * Wrap a {@link CryptoHDKey} in a {@link CryptoOutput} using the
 * `witness-public-key-hash` script expression (the convention Keystone-class
 * devices use for Ethereum account descriptors).
 *
 * @param hdKey - The HD key to wrap.
 * @returns A CryptoOutput descriptor.
 */
export function createCryptoOutput(hdKey: CryptoHDKey): CryptoOutput {
  return new CryptoOutput([ScriptExpressions.WITNESS_PUBLIC_KEY_HASH], hdKey);
}

/**
 * Construct a {@link CryptoAccount} from a master fingerprint and a list of
 * output descriptors.
 *
 * @param masterFingerprint - 4-byte device fingerprint Buffer.
 * @param outputs - Output descriptors to bundle into the account.
 * @returns A CryptoAccount.
 */
export function createCryptoAccount(
  masterFingerprint: Buffer,
  outputs: CryptoOutput[],
): CryptoAccount {
  return new CryptoAccount(masterFingerprint, outputs);
}
