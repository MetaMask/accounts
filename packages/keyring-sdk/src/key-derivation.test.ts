import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '@metamask/key-derivation-purposes';
import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import * as bip39 from '@metamask/scure-bip39';
import * as hkdfModule from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

import { fingerprint } from './entropy';
import { KeyRoot } from './key-derivation';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PURPOSE = MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE;

describe('KeyRoot', () => {
  const roots: KeyRoot[] = [];

  // Destroy test roots even when an assertion fails.
  const fromMnemonic = async (
    options: Parameters<typeof KeyRoot.fromMnemonic>[0],
  ): Promise<KeyRoot> => {
    const root = await KeyRoot.fromMnemonic(options);
    roots.push(root);
    return root;
  };

  afterEach(() => {
    roots.splice(0).forEach((root) => root.destroy());
  });

  describe('fromMnemonic', () => {
    it.each([{}, { index: undefined }])(
      'defaults to index zero for %j',
      async (options) => {
        const root = await fromMnemonic({ mnemonic: MNEMONIC, ...options });
        const explicit = await fromMnemonic({ mnemonic: MNEMONIC, index: 0 });
        expect(
          await root.deriveEncryptionKey({ purpose: PURPOSE }),
        ).toStrictEqual(
          await explicit.deriveEncryptionKey({ purpose: PURPOSE }),
        );
      },
    );

    it('rejects a null index rather than defaulting to zero', async () => {
      await expect(
        // @ts-expect-error Intentionally pass null for runtime validation.
        KeyRoot.fromMnemonic({ mnemonic: MNEMONIC, index: null }),
      ).rejects.toThrow('Invalid key index');
    });

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
        KeyRoot.fromMnemonic({ mnemonic: MNEMONIC, index }),
      ).rejects.toThrow('Invalid key index');
    });

    it.each([
      '',
      'abandon',
      Array(12).fill('abandon').join(' '),
      MNEMONIC.replace('about', 'invalidword'),
      `${MNEMONIC} abandon`,
    ])('rejects invalid mnemonic %j', async (mnemonic) => {
      await expect(KeyRoot.fromMnemonic({ mnemonic })).rejects.toThrow(
        'Invalid mnemonic',
      );
    });

    it('rejects byte representations', async () => {
      await expect(
        KeyRoot.fromMnemonic({
          // @ts-expect-error Intentionally pass bytes for runtime validation.
          mnemonic: new TextEncoder().encode(MNEMONIC),
        }),
      ).rejects.toThrow('expected a BIP-39 phrase string');
    });

    it('normalizes the phrase using NFKD', async () => {
      const mnemonic = Array.from(MNEMONIC, (character) =>
        character === ' '
          ? character
          : String.fromCharCode(character.charCodeAt(0) + 0xfee0),
      ).join('');
      const root = await fromMnemonic({ mnemonic });
      expect(
        Buffer.from(
          await root.deriveEncryptionKey({ purpose: PURPOSE }),
        ).toString('hex'),
      ).toBe(
        '121859a7da2699610ac2dd81fbcf1ec70d7a232d4295e8c8a4dc7de9345f2817',
      );
    });

    it('keeps bytes private and rejects serialization', async () => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      expect(Reflect.ownKeys(root)).toStrictEqual([]);
      expect(Object.isFrozen(root)).toBe(true);
      expect(() => JSON.stringify(root)).toThrow(
        'Key roots cannot be serialized',
      );
    });

    it('wipes the seed and library private data after successful derivation', async () => {
      const seed = new Uint8Array(64).fill(1);
      jest.spyOn(bip39, 'mnemonicToSeed').mockResolvedValue(seed);
      const wipe = jest.spyOn(HDKey.prototype, 'wipePrivateData');
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      expect(seed).toStrictEqual(new Uint8Array(64));
      expect(wipe).toHaveBeenCalledTimes(2);
      expect(await root.deriveEncryptionKey({ purpose: PURPOSE })).toHaveLength(
        32,
      );
    });

    it('wipes the seed when master derivation fails', async () => {
      const seed = new Uint8Array(64).fill(1);
      jest.spyOn(bip39, 'mnemonicToSeed').mockResolvedValue(seed);
      jest.spyOn(HDKey, 'fromMasterSeed').mockImplementation(() => {
        throw new Error('Master derivation failed');
      });
      await expect(
        KeyRoot.fromMnemonic({ mnemonic: MNEMONIC }),
      ).rejects.toThrow('Master derivation failed');
      expect(seed).toStrictEqual(new Uint8Array(64));
    });

    it('wipes the master when child derivation fails', async () => {
      const wipe = jest.spyOn(HDKey.prototype, 'wipePrivateData');
      jest.spyOn(HDKey.prototype, 'derive').mockImplementation(() => {
        throw new Error('Child derivation failed');
      });
      await expect(
        KeyRoot.fromMnemonic({ mnemonic: MNEMONIC }),
      ).rejects.toThrow('Child derivation failed');
      expect(wipe).toHaveBeenCalledTimes(1);
    });

    it('rejects a missing derived private key', async () => {
      const publicOnly = HDKey.fromMasterSeed(
        new Uint8Array(32),
      ).wipePrivateData();
      jest.spyOn(HDKey.prototype, 'derive').mockReturnValue(publicOnly);
      await expect(
        KeyRoot.fromMnemonic({ mnemonic: MNEMONIC }),
      ).rejects.toThrow('Failed to derive key root');
    });
  });

  describe('deriveEncryptionKey', () => {
    it('matches the normative root, key, and fingerprint', async () => {
      const spy = jest.spyOn(hkdfModule, 'hkdf');
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      const key = await root.deriveEncryptionKey({ purpose: PURPOSE });
      expect(spy).toHaveBeenCalledWith(
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
      expect(await fingerprint(key)).toBe(
        'f4e791cc-14c7-4f84-b861-1dcdbe2b114c',
      );
    });

    it.each([
      [1, '17e711cc2a5ceb870c4d2306771ff48127431eedbc827a1a31317f11acf7e2d7'],
      [
        0x7fffffff,
        '899b8d1ea94b40bd93017e86ac6ee033939fd3ce22b640d7e2520c68ce36ce1e',
      ],
      // Leading-zero key and root respectively.
      [98, '003e9f0539f8a6287f3b07097eab3dcfc912eec8e629a7a7ff3edcbe9be80c8e'],
      [12, '04ad0389013e4b831392a74b4cc618671b7c4284f4bee5f08845e66ef8d18f63'],
    ])('matches the 32-byte key for index %s', async (index, expected) => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC, index });
      const key = await root.deriveEncryptionKey({ purpose: PURPOSE });
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
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      expect(
        Buffer.from(await root.deriveEncryptionKey({ purpose })).toString(
          'hex',
        ),
      ).toBe(expected);
    });

    it('reproduces keys across roots and returns independent arrays', async () => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      const restored = await fromMnemonic({ mnemonic: MNEMONIC });
      const first = await root.deriveEncryptionKey({ purpose: PURPOSE });
      const second = await restored.deriveEncryptionKey({ purpose: PURPOSE });
      expect(first).toStrictEqual(second);
      first.fill(0);
      expect(
        await root.deriveEncryptionKey({ purpose: PURPOSE }),
      ).toStrictEqual(second);
    });

    it('accepts consumer-defined purposes and version zero', async () => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      const key = await root.deriveEncryptionKey({
        purpose: 'metamask:consumer-defined:application-data:v0',
      });
      expect(key).toHaveLength(32);
      expect(key).not.toStrictEqual(
        await root.deriveEncryptionKey({ purpose: PURPOSE }),
      );
    });

    it('separates different mnemonics', async () => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      const other = await fromMnemonic({
        mnemonic:
          'legal winner thank year wave sausage worth useful legal winner thank yellow',
      });
      expect(
        await root.deriveEncryptionKey({ purpose: PURPOSE }),
      ).not.toStrictEqual(
        await other.deriveEncryptionKey({ purpose: PURPOSE }),
      );
    });

    it('rejects forged receivers', async () => {
      await expect(
        KeyRoot.prototype.deriveEncryptionKey.call({} as KeyRoot, {
          purpose: PURPOSE,
        }),
      ).rejects.toThrow(TypeError);
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
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      await expect(
        root.deriveEncryptionKey({
          // @ts-expect-error Intentionally pass invalid purposes for runtime validation.
          purpose,
        }),
      ).rejects.toThrow('Invalid key purpose');
    });
  });

  describe('destroy', () => {
    it('zeroizes the owned buffer, rejects derivation, and permits repeated destruction', async () => {
      const spy = jest.spyOn(hkdfModule, 'hkdf');
      const root = await fromMnemonic({ mnemonic: MNEMONIC });
      const key = await root.deriveEncryptionKey({ purpose: PURPOSE });
      const originalKey = Uint8Array.from(key);
      const ownedBytes = spy.mock.calls[0]?.[1];
      expect(ownedBytes).toBeInstanceOf(Uint8Array);
      expect(ownedBytes).not.toStrictEqual(new Uint8Array(32));
      root.destroy();
      root.destroy();
      expect(ownedBytes).toStrictEqual(new Uint8Array(32));
      expect(key).toStrictEqual(originalKey);
      await expect(
        root.deriveEncryptionKey({ purpose: PURPOSE }),
      ).rejects.toThrow('Key root has been destroyed');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
