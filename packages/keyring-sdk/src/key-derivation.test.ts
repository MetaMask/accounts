import { MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE } from '@metamask/key-derivation-purposes';
import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import * as bip39 from '@metamask/scure-bip39';
import * as hkdfModule from '@noble/hashes/hkdf';
import * as hmacModule from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { HDKey } from 'ethereum-cryptography/hdkey';

import { fingerprint } from './entropy';
import { KeyRoot } from './key-derivation';

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
const PURPOSE = MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE;

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
    describe('BIP-85', () => {
      it('matches the published entropy transformation and wipes its temporary output', async () => {
        // BIP-85 test case 1: inject its child key to isolate the transformation.
        const node = HDKey.fromExtendedKey(
          'xprv9s21ZrQH143K2LBWUUQRFXhucrQqBpKdRRxNVq2zBqsx8HVqFk2uYo8kmbaLLHRdqtQpUm98uKfu3vca1LqdGhUtyoFnCNkfmXRyPXLjbKb',
        ).derive("m/83696968'/0'/0'");
        const derive = jest
          .spyOn(HDKey.prototype, 'derive')
          .mockReturnValue(node);
        const hmac = jest.spyOn(hmacModule, 'hmac');
        const hkdf = jest.spyOn(hkdfModule, 'hkdf');
        const root = await fromMnemonic({ mnemonic: MNEMONIC });
        expect(derive).toHaveBeenCalledWith(
          "m/83696968'/77698465'/77658375'/0'",
        );
        expect(hmac.mock.results[0]?.value).toStrictEqual(new Uint8Array(64));
        hmac.mockRestore();
        await root.deriveEncryptionKey({ purpose: PURPOSE });
        expect(hkdf.mock.calls[0]?.[1]).toStrictEqual(
          new Uint8Array(
            Buffer.from(
              'efecfbccffea313214232d29e71563d941229afb4338c21f9517c41aaa0d16f0',
              'hex',
            ),
          ),
        );
      });
    });

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
        '7a170689f3de32aec28c3aae69c8399b058a5ec3a7096b75b090bb2553a81307',
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
            '84e12401a1b0ab4edb9a5ba414101290bd3b5dfca77dd284c232e4c495007671',
            'hex',
          ),
        ),
        new Uint8Array(32),
        new TextEncoder().encode(PURPOSE),
        32,
      );
      expect(Buffer.from(key).toString('hex')).toBe(
        '7a170689f3de32aec28c3aae69c8399b058a5ec3a7096b75b090bb2553a81307',
      );
      expect(await fingerprint(key)).toBe(
        '5f0806f9-d243-468e-a7fb-f5af49c14312',
      );
    });

    it.each([
      [1, '0fdd6cbe70681c18b8735252354767911553c54a6d11f39b6a02b8fcc8800d83'],
      [
        0x7fffffff,
        '07fe154de2f42d2bcee0ea7cc095a745cb0e20147ee3b1d2e846fa5c5de472f6',
      ],
      // Leading-zero key and root respectively.
      [243, '00d1bd6392885263624916b84bbec5f175cee4fe116c04b80251c6f188e54ec6'],
      [96, 'ee11b6add69ab493f3860e956487261a0302895cf88b9e07a05f1b330e2a2ee2'],
    ])('matches the 32-byte key for index %s', async (index, expected) => {
      const root = await fromMnemonic({ mnemonic: MNEMONIC, index });
      const key = await root.deriveEncryptionKey({ purpose: PURPOSE });
      expect(key).toHaveLength(32);
      expect(Buffer.from(key).toString('hex')).toBe(expected);
    });

    it.each<[KeyDerivationPurpose, string]>([
      [
        'metamask:money-account:mpc:device-share:wrapping-key:v2',
        '39319c24c48331860a8c7c85cc244b0c6b01259f4c2dcc6ea8cfbf369d14fb2c',
      ],
      [
        'metamask:encryption:🔑:v1',
        '0df8c473f780a6e28f41be84077758cb3939c19d1a6777a0176bf9145008e7c2',
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
