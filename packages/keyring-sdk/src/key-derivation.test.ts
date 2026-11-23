import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '@metamask/key-derivation-purposes';
import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import * as hkdfModule from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

import { fingerprint } from './entropy';
import { deriveEncryptionKey, deriveKeyRoot } from './key-derivation';
import type { KeyRoot } from './key-derivation';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PURPOSE = MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE;

describe('deriveKeyRoot', () => {
  it.each([
    -1,
    0.5,
    2 ** 31,
    Number.MAX_SAFE_INTEGER,
    NaN,
    Infinity,
    -Infinity,
  ])('rejects invalid index %s', async (index) => {
    await expect(deriveKeyRoot({ mnemonic: MNEMONIC, index })).rejects.toThrow(
      'Invalid key index',
    );
  });

  it.each([
    '',
    'abandon',
    Array(12).fill('abandon').join(' '), // Invalid checksum.
    MNEMONIC.replace('about', 'invalidword'),
    `${MNEMONIC} abandon`, // Invalid word count.
  ])('rejects invalid mnemonic %j', async (mnemonic) => {
    await expect(deriveKeyRoot({ mnemonic, index: 0 })).rejects.toThrow(
      'Invalid mnemonic',
    );
  });

  it('rejects byte representations rather than interpreting them as phrases', async () => {
    await expect(
      deriveKeyRoot({
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
    const root = await deriveKeyRoot({ mnemonic, index: 0 });
    const key = await deriveEncryptionKey({ root, purpose: PURPOSE });
    expect(Buffer.from(key).toString('hex')).toBe(
      '121859a7da2699610ac2dd81fbcf1ec70d7a232d4295e8c8a4dc7de9345f2817',
    );
  });

  it('does not expose root bytes as properties or JSON', async () => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
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
      deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 }),
    ).rejects.toThrow('Failed to derive key root');
  });
});

describe('deriveEncryptionKey', () => {
  it('matches the normative root, encryption key, and fingerprint', async () => {
    const hkdfSpy = jest.spyOn(hkdfModule, 'hkdf');
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    const key = await deriveEncryptionKey({ root, purpose: PURPOSE });
    expect(hkdfSpy).toHaveBeenCalledWith(
      sha256,
      new Uint8Array(
        Buffer.from(
          '40594a11259ff0c240d361055c9e40737d62ed670e93308122413a5a59d1cee0',
          'hex',
        ),
      ),
      new Uint8Array(32),
      new TextEncoder().encode(PURPOSE),
      32,
    );
    expect(Buffer.from(key).toString('hex')).toBe(
      '121859a7da2699610ac2dd81fbcf1ec70d7a232d4295e8c8a4dc7de9345f2817',
    );
    expect(await fingerprint(key)).toBe('f4e791cc-14c7-4f84-b861-1dcdbe2b114c');
  });

  // Additional vectors cross-checked using Node's crypto PBKDF2 and HKDF.
  it.each([
    [1, '17e711cc2a5ceb870c4d2306771ff48127431eedbc827a1a31317f11acf7e2d7'],
    [
      0x7fffffff,
      '899b8d1ea94b40bd93017e86ac6ee033939fd3ce22b640d7e2520c68ce36ce1e',
    ],
    // The encryption key begins with a zero byte.
    [98, '003e9f0539f8a6287f3b07097eab3dcfc912eec8e629a7a7ff3edcbe9be80c8e'],
    // The root begins with a zero byte (00e822aa...), which must reach HKDF intact.
    [12, '04ad0389013e4b831392a74b4cc618671b7c4284f4bee5f08845e66ef8d18f63'],
  ])('matches the 32-byte key for index %s', async (index, expected) => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index });
    const key = await deriveEncryptionKey({ root, purpose: PURPOSE });
    expect(key).toHaveLength(32);
    expect(Buffer.from(key).toString('hex')).toBe(expected);
  });

  it.each<[KeyDerivationPurpose, string]>([
    [
      'metamask:money-account:mfa:encryption-key:v2',
      'aa19f5bc547eab23b757d899feb940e370e5e0cbdd142d3c61579e06dbd0570b',
    ],
    [
      'metamask:encryption:🔑:v1',
      'de8d08849a8a55abc5bfbe9122c7a6925c5601df467bc41f363d4d36d00a7946',
    ],
  ])('uses the exact UTF-8 purpose %s', async (purpose, expected) => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    expect(
      Buffer.from(await deriveEncryptionKey({ root, purpose })).toString('hex'),
    ).toBe(expected);
  });

  it('reproduces keys across roots and returns independent byte arrays', async () => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    const restoredRoot = await deriveKeyRoot({
      mnemonic: MNEMONIC,
      index: 0,
    });
    const first = await deriveEncryptionKey({ root, purpose: PURPOSE });
    const second = await deriveEncryptionKey({
      root: restoredRoot,
      purpose: PURPOSE,
    });
    expect(first).toStrictEqual(second);
    first.fill(0);
    expect(await deriveEncryptionKey({ root, purpose: PURPOSE })).toStrictEqual(
      second,
    );
  });

  it('accepts consumer-defined purposes and version zero without registry membership', async () => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    const key = await deriveEncryptionKey({
      root,
      purpose: 'metamask:consumer-defined:application-data:v0',
    });
    expect(key).toHaveLength(32);
    expect(key).not.toStrictEqual(
      await deriveEncryptionKey({ root, purpose: PURPOSE }),
    );
  });

  it('separates different mnemonics', async () => {
    const root = await deriveKeyRoot({
      mnemonic:
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
      index: 0,
    });
    const otherRoot = await deriveKeyRoot({
      mnemonic: MNEMONIC,
      index: 0,
    });
    expect(
      await deriveEncryptionKey({ root, purpose: PURPOSE }),
    ).not.toStrictEqual(
      await deriveEncryptionKey({ root: otherRoot, purpose: PURPOSE }),
    );
  });

  it('rejects forged roots', async () => {
    await expect(
      deriveEncryptionKey({ root: {} as KeyRoot, purpose: PURPOSE }),
    ).rejects.toThrow('Invalid key root');
  });

  it.each([
    '',
    undefined,
    1,
    'example:v1',
    'metamask::v1',
    'metamask:example',
    'metamask:example:v-1',
    'metamask:example:v1.5',
    'metamask:example:v1e2',
    'metamask:example:v1\n',
  ])('rejects invalid purpose %s', async (purpose) => {
    const root = await deriveKeyRoot({ mnemonic: MNEMONIC, index: 0 });
    await expect(
      // @ts-expect-error Intentionally pass invalid purposes for runtime validation.
      deriveEncryptionKey({ root, purpose }),
    ).rejects.toThrow('Invalid key purpose');
  });
});
