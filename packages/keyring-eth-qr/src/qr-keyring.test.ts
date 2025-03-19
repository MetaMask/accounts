import { add0x, bytesToHex, type Hex } from '@metamask/utils';
import { UR } from '@ngraveio/bc-ur';

import { QrKeyring } from './qr-keyring';

const MOCK_HDKEY_UR =
  'UR:CRYPTO-HDKEY/PTAOWKAXHDCLAXSTAMKNVLDPLPFSAACNVEOLIEJYGAVASSGAEHDEPEYKDESWTSFXWMENTPPSDNLKGSAAHDCXTEKTMNGRRTWMJZWLIELKCWWFFHPTTBFPKBKTSODNSAZEWYLKBAQDLPSNHECHWKLKAHTAADEHOEADCSFNAOAEAMTAADDYOTADLNCSDWYKCSFNYKAEYKAOCYPSSWIAVLAXAXATTAADDYOEADLRAEWKLAWKAXAEAYCYSBTKETFYASISGRIHKKJKJYJLJTIHBKJOHSIAIAJLKPJTJYDMJKJYHSJTIEHSJPIEQZBZVWLP';

describe('QrKeyring', () => {
  describe('constructor', () => {
    it('can be constructed with a CBOR encoded UR', () => {
      // @ts-expect-error testing
      const keyring = new QrKeyring({ cbor: MOCK_HDKEY_UR });
      expect(keyring).toBeInstanceOf(QrKeyring);
    });
  });
});
