import { QrKeyring } from './qr-keyring';

const KNOWN_HDKEY_UR =
  'UR:CRYPTO-HDKEY/ONAXHDCLAXPYSTPELBTLSNGWTTWPGSBSIOWKRFOXHSWSRHURSAHGMYMNTEFLTEBGADAHAXKTNBAAHDCXIODLDNDNZCONGOGMYKJLGHCLTDRYBEJTGOWZWLGLJKEOKIHEFHCLNLAMQDNDZSGEAMTAADDYOEADLNCSDWYKCSFNYKAEYKAOCYIHCHGSOYAYCYIHIAECEYASJNFPINJPFLHSJOCXDPCXJYIHJKJYINDAAAEC';

const EXPECTED_ACCOUNTS = [
  '0x8DC309e828CE024b1ae7a9AA7882D37AD18181d5',
  '0x98396D8bF756F419eF6CDba819e9DF00E6F2B51B',
  '0xC64D05CD3582531f19dcB16e5FA9652B281fA018',
];

describe('QrKeyring', () => {
  describe('constructor', () => {
    it('can be constructed with no arguments', () => {
      const keyring = new QrKeyring({});
      expect(keyring).toBeInstanceOf(QrKeyring);
    });

    it('can be constructed with a UR', () => {
      const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });
      expect(keyring).toBeInstanceOf(QrKeyring);
      expect(keyring.ur).toBe(KNOWN_HDKEY_UR);
    });
  });

  describe('serialize', () => {
    describe('when the QrKeyring has no accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          accounts: {},
          ur: KNOWN_HDKEY_UR,
        });
      });
    });

    describe('when the QrKeyring has accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });
        await keyring.addAccounts(1);

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          accounts: {
            '0': EXPECTED_ACCOUNTS[0],
          },
          ur: KNOWN_HDKEY_UR,
        });
      });
    });
  });

  describe('deserialize', () => {
    describe('when the state does not include a UR', () => {
      it('deserializes the state', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize({ accounts: {} });

        expect(await keyring.getAccounts()).toStrictEqual([]);
      });
    });

    describe('when the state includes accounts but no UR', () => {
      it('throws an error', async () => {
        const keyring = new QrKeyring();

        await expect(
          keyring.deserialize({ accounts: { '0': EXPECTED_ACCOUNTS[0] } }),
        ).rejects.toThrow(
          'QrKeyring state must include a UR when accounts are present',
        );
      });
    });

    describe('when the state includes a UR', () => {
      it('deserializes the state', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize({ accounts: {}, ur: KNOWN_HDKEY_UR });

        expect(keyring.ur).toStrictEqual(KNOWN_HDKEY_UR);
      });
    });

    describe('when the state includes a UR and accounts', () => {
      it('deserializes the state with accounts', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize({
          accounts: { '0': EXPECTED_ACCOUNTS[0] },
          ur: KNOWN_HDKEY_UR,
        });

        expect(await keyring.getAccounts()).toStrictEqual(
          EXPECTED_ACCOUNTS.slice(0, 1),
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
    it('initializes the QrKeyring with a UR', () => {
      const keyring = new QrKeyring();

      keyring.submitUR(KNOWN_HDKEY_UR);

      expect(keyring.ur).toBe(KNOWN_HDKEY_UR);
    });

    it('reinitializes the QrKeyring with a new UR', () => {
      const keyring = new QrKeyring({ ur: KNOWN_HDKEY_UR });

      const newUr =
        'ur:crypto-hdkey/oxaxhdclaowdverokopdinhseeroisyalksaykctjshedprnuyjyfgrovawewftyghceglrpkgaahdcxtplfjsluknfwlaisaxwypalbjylswzamcxhscyuyloztmwfnldlgskpyptgsdecfamtaaddyoeadlncsdwykcsfnykaeykaocywlcscewfaycytedmfeayghlptnin';
      keyring.submitUR(newUr);

      expect(keyring.ur).toBe(newUr);
    });

    it('throws an error if the UR is invalid', () => {
      const keyring = new QrKeyring();
      expect(() => keyring.submitUR('invalid-ur')).toThrow('Invalid UR format');
    });
  });
});
