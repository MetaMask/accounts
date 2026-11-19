import * as hkdfModule from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

import { fingerprint } from './entropy';
import { deriveWrappingKey, deriveWrappingKeyRoot } from './wrapping-key';
import type { WrappingKeyRoot } from './wrapping-key';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PURPOSE = 'metamask:money-account:mfa:encryption-key:v1';

describe('deriveWrappingKeyRoot', () => {
  it.each([
    -1,
    0.5,
    2 ** 31,
    Number.MAX_SAFE_INTEGER,
    NaN,
    Infinity,
    -Infinity,
  ])('rejects invalid index %s', async (index) => {
    await expect(
      deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index }),
    ).rejects.toThrow('Invalid wrapping-key index');
  });

  it.each([
    '',
    'abandon',
    Array(12).fill('abandon').join(' '), // Invalid checksum.
    MNEMONIC.replace('about', 'invalidword'),
    `${MNEMONIC} abandon`, // Invalid word count.
  ])('rejects invalid mnemonic %j', async (mnemonic) => {
    await expect(deriveWrappingKeyRoot({ mnemonic, index: 0 })).rejects.toThrow(
      'Invalid mnemonic',
    );
  });

  it('rejects byte representations rather than interpreting them as phrases', async () => {
    await expect(
      deriveWrappingKeyRoot({
        // @ts-expect-error Intentionally pass bytes to test runtime validation.
        mnemonic: new TextEncoder().encode(MNEMONIC),
        index: 0,
      }),
    ).rejects.toThrow('expected a BIP-39 phrase string');
  });

  it('normalizes the phrase using NFKD before derivation', async () => {
    // Full-width ASCII normalizes to the English phrase above.
    const mnemonic = Array.from(MNEMONIC, (character) =>
      character === ' '
        ? character
        : String.fromCharCode(character.charCodeAt(0) + 0xfee0),
    ).join('');
    const root = await deriveWrappingKeyRoot({ mnemonic, index: 0 });
    const key = await deriveWrappingKey({ root, purpose: PURPOSE });
    expect(Buffer.from(key).toString('hex')).toBe(
      '073b64685ad165da85cae7c6eb9d6d387750eabd79c04034d7a44a99ac1aa3ae',
    );
  });

  it('does not expose root bytes as properties or JSON', async () => {
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    expect(Reflect.ownKeys(root)).toStrictEqual([]);
    expect(JSON.stringify(root)).toBe('{}');
    expect(Object.isFrozen(root)).toBe(true);
  });

  it('rejects a missing derived private key', async () => {
    const publicOnlyNode = HDKey.fromMasterSeed(
      new Uint8Array(32),
    ).wipePrivateData();
    jest.spyOn(HDKey.prototype, 'derive').mockReturnValue(publicOnlyNode);
    await expect(
      deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 }),
    ).rejects.toThrow('Failed to derive wrapping-key root');
  });
});

describe('deriveWrappingKey', () => {
  it('matches the normative root, wrapping key, and fingerprint', async () => {
    const hkdfSpy = jest.spyOn(hkdfModule, 'hkdf');
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    const key = await deriveWrappingKey({ root, purpose: PURPOSE });
    expect(hkdfSpy).toHaveBeenCalledWith(
      sha256,
      new Uint8Array(
        Buffer.from(
          '9581a07a2012e7fc0da41f78eb0a58716a2f09377ab8f7ba9288fe79af22bf05',
          'hex',
        ),
      ),
      new Uint8Array(32),
      new TextEncoder().encode(PURPOSE),
      32,
    );
    expect(Buffer.from(key).toString('hex')).toBe(
      '073b64685ad165da85cae7c6eb9d6d387750eabd79c04034d7a44a99ac1aa3ae',
    );
    expect(await fingerprint(key)).toBe('48acd7b3-10fc-4abb-a798-180894e9f65b');
  });

  // Additional vectors cross-checked using Node's crypto PBKDF2 and HKDF.
  it.each([
    [1, 'bcd5058d409183f1d853c843470c91850ce774d2b8e2457491004cdc3ffd77e8'],
    [
      0x7fffffff,
      '814a31bd8bff36fd33dd9e43fcfec378306287c13b3e19f3c4e71b779644015a',
    ],
    // The wrapping key begins with a zero byte.
    [71, '0004070f8106930847423c85bfc285f5a0b06ef2f1c3a0abcf609a2b9c7595fe'],
    // The root begins with a zero byte (001465bd...), which must reach HKDF intact.
    [182, '132f05dc4a10dbb20124ac2b6480eb229bf203e5841ea125f653f8f0ae94ce49'],
  ])('matches the 32-byte key for index %s', async (index, expected) => {
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index });
    const key = await deriveWrappingKey({ root, purpose: PURPOSE });
    expect(key).toHaveLength(32);
    expect(Buffer.from(key).toString('hex')).toBe(expected);
  });

  it.each([
    [
      'metamask:money-account:mfa:encryption-key:v2',
      '87c108634bd23dc894c62fa0a5d73a5a637b3f7ee8e0462c08110868865b924a',
    ],
    [
      'metamask:wrapping:🔑:v1',
      '41dc7cc99bda1c2087686991f575fa4054538711cff71b1e65f547774f934ec5',
    ],
  ])('uses the exact UTF-8 purpose %s', async (purpose, expected) => {
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    expect(
      Buffer.from(await deriveWrappingKey({ root, purpose })).toString('hex'),
    ).toBe(expected);
  });

  it('reproduces keys across roots and returns independent byte arrays', async () => {
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    const restoredRoot = await deriveWrappingKeyRoot({
      mnemonic: MNEMONIC,
      index: 0,
    });
    const first = await deriveWrappingKey({ root, purpose: PURPOSE });
    const second = await deriveWrappingKey({
      root: restoredRoot,
      purpose: PURPOSE,
    });
    expect(first).toStrictEqual(second);
    first.fill(0);
    expect(await deriveWrappingKey({ root, purpose: PURPOSE })).toStrictEqual(
      second,
    );
  });

  it('separates different mnemonics', async () => {
    const root = await deriveWrappingKeyRoot({
      mnemonic:
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
      index: 0,
    });
    const otherRoot = await deriveWrappingKeyRoot({
      mnemonic: MNEMONIC,
      index: 0,
    });
    expect(
      await deriveWrappingKey({ root, purpose: PURPOSE }),
    ).not.toStrictEqual(
      await deriveWrappingKey({ root: otherRoot, purpose: PURPOSE }),
    );
  });

  it('rejects forged roots', async () => {
    await expect(
      deriveWrappingKey({ root: {} as WrappingKeyRoot, purpose: PURPOSE }),
    ).rejects.toThrow('Invalid wrapping-key root');
  });

  it.each(['', undefined, 1])('rejects invalid purpose %s', async (purpose) => {
    const root = await deriveWrappingKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    await expect(
      // @ts-expect-error Intentionally pass invalid purposes for runtime validation.
      deriveWrappingKey({ root, purpose }),
    ).rejects.toThrow('Invalid wrapping-key purpose');
  });
});
