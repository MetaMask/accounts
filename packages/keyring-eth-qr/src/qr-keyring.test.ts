import type { StoredKeyring } from '@keystonehq/base-eth-keyring';
import { CryptoHDKey } from '@keystonehq/bc-ur-registry-eth';
import { MetaMaskKeyring as KeystoneKeyring } from '@keystonehq/metamask-airgapped-keyring';
import type { Hex } from '@metamask/utils';

import type { SerializedQrKeyringState } from '.';
import { QrKeyring } from '.';
import { KeyringMode } from './account-deriver';

const KNOWN_HDKEY_UR =
  'UR:CRYPTO-HDKEY/ONAXHDCLAXPYSTPELBTLSNGWTTWPGSBSIOWKRFOXHSWSRHURSAHGMYMNTEFLTEBGADAHAXKTNBAAHDCXIODLDNDNZCONGOGMYKJLGHCLTDRYBEJTGOWZWLGLJKEOKIHEFHCLNLAMQDNDZSGEAMTAADDYOEADLNCSDWYKCSFNYKAEYKAOCYIHCHGSOYAYCYIHIAECEYASJNFPINJPFLHSJOCXDPCXJYIHJKJYINDAAAEC';

const KNOWN_CBOR =
  'a503582103abc7af7fd5cd4fd1ec4c0f67f4bca461efb9dfc2578f8ed347d31201050377a0045820672f2b2bfda55552f56f5421d2bd106e55f2e94e73337d5f3f219906b39bfa4a06d90130a20186182cf5183cf500f5021a65174ca1081a65633532096d416972476170202d2074657374';

const KNOWN_HDKEY: CryptoHDKey = CryptoHDKey.fromCBOR(
  Buffer.from(KNOWN_CBOR, 'hex'),
);

const EXPECTED_ACCOUNTS: Hex[] = [
  '0x8DC309e828CE024b1ae7a9AA7882D37AD18181d5',
  '0x98396D8bF756F419eF6CDba819e9DF00E6F2B51B',
  '0xC64D05CD3582531f19dcB16e5FA9652B281fA018',
];

// Coming from an extension installation using `@keystonehq/metamask-airgapped-keyring`
// and with a paired QR-based Device configured with the above known SRP
const SERIALIZED_KEYSTONE_KEYRING: StoredKeyring = {
  initialized: true,
  accounts: [
    '0x8DC309e828CE024b1ae7a9AA7882D37AD18181d5',
    '0x98396D8bF756F419eF6CDba819e9DF00E6F2B51B',
    '0xC64D05CD3582531f19dcB16e5FA9652B281fA018',
  ],
  keyringAccount: 'account.standard',
  keyringMode: KeyringMode.HD,
  name: 'AirGap - test',
  version: 1,
  xfp: '65174ca1',
  xpub: 'xpub6CPzTSQVcBw9QiZT3wcB6bUVW53m1ica5uByu5ktss4aHSqdj85GitSLT9uarxQgoyfaedxkWZKAeSjSSMNSursAd7eiFpc5ywjnkS1Aur4',
  hdPath: "m/44'/60'/0'",
  childrenPath: '0/*',
  indexes: {
    '0x8DC309e828CE024b1ae7a9AA7882D37AD18181d5': 0,
    '0x98396D8bF756F419eF6CDba819e9DF00E6F2B51B': 1,
    '0xC64D05CD3582531f19dcB16e5FA9652B281fA018': 2,
  },
  paths: {},
  // These last properties are not used by `@metamask/eth-qr-keyring`
  currentAccount: 0,
  page: 0,
  perPage: 5,
};

const SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS: SerializedQrKeyringState = {
  initialized: true,
  name: 'AirGap - test',
  keyringMode: KeyringMode.HD,
  keyringAccount: KNOWN_HDKEY.getNote(),
  xfp: KNOWN_HDKEY.getParentFingerprint()?.toString('hex'),
  xpub: KNOWN_HDKEY.getBip32Key(),
  accounts: [],
  indexes: {},
  hdPath: "m/44'/60'/0'",
  childrenPath: '0/*',
};

/**
 * Get the xpub from a keyring.
 *
 * @param keyring - The keyring to get the xpub from.
 * @returns The xpub of the keyring.
 */
async function getXPUBFromKeyring(
  keyring: QrKeyring | KeystoneKeyring,
): Promise<string> {
  const serialized = await keyring.serialize();
  if (!serialized.initialized || serialized.keyringMode !== KeyringMode.HD) {
    throw new Error('Keyring is not initialized');
  }
  return serialized.xpub;
}

/**
 * Get a Keystone keyring instance using `@keystonehq/metamask-airgapped-keyring`.
 *
 * @returns A Keystone keyring instance with the serialized state.
 */
async function getLegacyKeystoneKeyring(): Promise<KeystoneKeyring> {
  const keystoneKeyring = new KeystoneKeyring();
  keystoneKeyring.deserialize(SERIALIZED_KEYSTONE_KEYRING);
  return keystoneKeyring;
}

describe('QrKeyring', () => {
  describe('constructor', () => {
    it('can be constructed with no arguments', () => {
      const keyring = new QrKeyring({});
      expect(keyring).toBeInstanceOf(QrKeyring);
    });

    it('can be constructed with a UR', async () => {
      const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

      expect(await keyring.serialize()).toStrictEqual(
        SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS,
      );
    });
  });

  describe('serialize', () => {
    describe('when the QrKeyring has no accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual(
          SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS,
        );
      });
    });

    describe('when the QrKeyring has accounts', () => {
      it('returns the serialized state including added accounts', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });
        await keyring.addAccounts(2);

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          ...SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS,
          accounts: [EXPECTED_ACCOUNTS[0], EXPECTED_ACCOUNTS[1]],
          indexes: {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [EXPECTED_ACCOUNTS[0]!]: 0,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            [EXPECTED_ACCOUNTS[1]!]: 1,
          },
        });
      });
    });
  });

  describe('deserialize', () => {
    describe('when deserializing a state with accounts', () => {
      it('deserializes the state with accounts', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize(SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS);

        expect(await keyring.getAccounts()).toStrictEqual([]);
        expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
          SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS.xpub,
        );
      });

      it('throws an error if accounts and indexes are not of the same number', async () => {
        const keyring = new QrKeyring();

        await expect(
          keyring.deserialize({
            ...SERIALIZED_QR_KEYRING_WITH_NO_ACCOUNTS,
            accounts: EXPECTED_ACCOUNTS,
            indexes: {
              // there should be 3 indexes mapped here
            },
          }),
        ).rejects.toThrow(
          'The number of accounts does not match the number of indexes',
        );
      });
    });

    describe('when using a serialized state coming from `@keystonehq/metamask-airgapped-keyring`', () => {
      it('deserializes the state with accounts', async () => {
        const keystoneKeyring = await getLegacyKeystoneKeyring();
        const keyring = new QrKeyring();

        // @ts-expect-error QrKeyring types are stricter than Keystone ones
        await keyring.deserialize(await keystoneKeyring.serialize());

        expect(await keystoneKeyring.getAccounts()).toStrictEqual(
          await keystoneKeyring.getAccounts(),
        );
        expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
          await getXPUBFromKeyring(keystoneKeyring),
        );
      });
    });
  });

  describe('addAccounts', () => {
    describe('when the keyring is initialized with a UR', () => {
      it('returns new accounts added', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

        const accounts = await keyring.addAccounts(1);

        expect(accounts).toHaveLength(1);
        expect(accounts[0]).toBe(EXPECTED_ACCOUNTS[0]);
      });

      it('adds multiple accounts', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

        const accounts = await keyring.addAccounts(3);

        expect(accounts).toHaveLength(3);
        expect(accounts).toStrictEqual(EXPECTED_ACCOUNTS);
      });

      it('does not add accounts that already exist', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });
        const firstAddition = await keyring.addAccounts(1);
        keyring.setAccountToUnlock(0);

        const secondAddition = await keyring.addAccounts(1);

        expect(firstAddition).toStrictEqual(EXPECTED_ACCOUNTS.slice(0, 1));
        expect(secondAddition).toStrictEqual([]);
        expect(await keyring.getAccounts()).toStrictEqual(
          EXPECTED_ACCOUNTS.slice(0, 1),
        );
      });
    });

    describe('when the keyring is not initialized with a UR', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring();

        await expect(keyring.addAccounts(1)).rejects.toThrow(
          'UR not initialized',
        );
      });
    });
  });

  describe('getAccounts', () => {
    describe('when no accounts have been added', () => {
      it('returns an empty array', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });
        expect(await keyring.getAccounts()).toStrictEqual([]);
      });
    });

    describe('when accounts have been added', () => {
      it('returns all the accounts added', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

        const accounts = await keyring.addAccounts(3);

        expect(await keyring.getAccounts()).toStrictEqual(EXPECTED_ACCOUNTS);
        expect(accounts).toStrictEqual(EXPECTED_ACCOUNTS);
      });
    });
  });

  describe('setAccountToUnlock', () => {
    it('sets an arbitrary account index to unlock', async () => {
      const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

      keyring.setAccountToUnlock(2);

      expect(await keyring.addAccounts(1)).toStrictEqual([
        EXPECTED_ACCOUNTS[2],
      ]);
    });
  });

  describe('submitUR', () => {
    it('initializes the QrKeyring with a UR', async () => {
      const keyring = new QrKeyring();

      keyring.submitUR(KNOWN_HDKEY_UR);

      expect(await getXPUBFromKeyring(keyring)).toStrictEqual(
        SERIALIZED_KEYSTONE_KEYRING.xpub,
      );
    });

    it('throws an error if the UR is invalid', () => {
      const keyring = new QrKeyring();
      expect(() => keyring.submitUR('invalid-ur')).toThrow('Invalid Scheme');
    });
  });
});
