import { QrKeyring } from './qr-keyring';

const MOCK_HDKEY_UR =
  'UR:CRYPTO-HDKEY/PTAOWKAXHDCLAXSTAMKNVLDPLPFSAACNVEOLIEJYGAVASSGAEHDEPEYKDESWTSFXWMENTPPSDNLKGSAAHDCXTEKTMNGRRTWMJZWLIELKCWWFFHPTTBFPKBKTSODNSAZEWYLKBAQDLPSNHECHWKLKAHTAADEHOEADCSFNAOAEAMTAADDYOTADLNCSDWYKCSFNYKAEYKAOCYPSSWIAVLAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYSBTKETFYASISGRIHKKJKJYJLJTIHBKJOHSIAIAJLKPJTJYDMJKJYHSJTIEHSJPIEQZBZVWLP';

describe('QrKeyring', () => {
  describe('constructor', () => {
    it('can be constructed with no arguments', () => {
      const keyring = new QrKeyring({});
      expect(keyring).toBeInstanceOf(QrKeyring);
    });

    it('can be constructed with a UR', () => {
      const keyring = new QrKeyring({ ur: MOCK_HDKEY_UR });
      expect(keyring).toBeInstanceOf(QrKeyring);
    });
  });

  describe('serialize', () => {
    describe('when the QrKeyring has no accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({ ur: MOCK_HDKEY_UR });

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          accounts: [],
          ur: MOCK_HDKEY_UR,
        });
      });
    });

    describe('when the QrKeyring has accounts', () => {
      it('returns the serialized state', async () => {
        const keyring = new QrKeyring({ ur: MOCK_HDKEY_UR });
        const accounts = await keyring.addAccounts(1);

        const serialized = await keyring.serialize();

        expect(serialized).toStrictEqual({
          accounts,
          ur: MOCK_HDKEY_UR,
        });
      });
    });
  });

  describe('deserialize', () => {
    describe('when the state does not include a UR', () => {
      it('deserializes the state', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize({ accounts: [] });

        expect(await keyring.getAccounts()).toStrictEqual([]);
      });
    });

    describe('when the state includes a UR', () => {
      it('deserializes the state', async () => {
        const keyring = new QrKeyring();

        await keyring.deserialize({ accounts: [], ur: MOCK_HDKEY_UR });

        expect(keyring.ur).toStrictEqual(MOCK_HDKEY_UR);
      });
    });
  });

  describe('addAccounts', () => {
    it('returns the new accounts', async () => {
      const keyring = new QrKeyring({ ur: MOCK_HDKEY_UR });

      const accounts = await keyring.addAccounts(1);

      expect(accounts).toHaveLength(1);
      expect(accounts[0]).toMatch(/^0x[0-9a-f]{40}$/u);
    });
  });
});
