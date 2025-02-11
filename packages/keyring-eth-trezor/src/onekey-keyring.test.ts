import HDKey from 'hdkey';
import * as sinon from 'sinon';

import { OneKeyKeyring } from './onekey-keyring';
import { TrezorBridge } from './trezor-bridge';
import { TrezorKeyring } from './trezor-keyring';

const fakeXPubKey =
  'xpub6FnCn6nSzZAw5Tw7cgR9bi15UV96gLZhjDstkXXxvCLsUXBGXPdSnLFbdpq8p9HmGsApME5hQTZ3emM2rnY5agb9rXpVGyy3bdW6EEgAtqt';
const fakeHdKey = HDKey.fromExtendedKey(fakeXPubKey);

describe('OneKeyKeyring', function () {
  let keyring: OneKeyKeyring;
  let bridge: TrezorBridge;

  beforeEach(async function () {
    bridge = {} as TrezorBridge;
    keyring = new OneKeyKeyring({ bridge });
    keyring.hdk = fakeHdKey;
  });

  afterEach(function () {
    sinon.restore();
  });

  it('extends TrezorKeyring', () => {
    expect(keyring).toBeInstanceOf(TrezorKeyring);
  });

  describe('Keyring.type', function () {
    it('is a class property that returns the type string.', function () {
      const { type } = TrezorKeyring;
      expect(typeof type).toBe('string');
    });

    it('returns the correct value', function () {
      const { type } = keyring;
      const correct = OneKeyKeyring.type;
      expect(type).toBe(correct);
    });
  });
});
