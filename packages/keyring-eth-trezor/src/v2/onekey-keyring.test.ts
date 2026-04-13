import { KeyringType } from '@metamask/keyring-api/v2';

import { OneKeyKeyring } from './onekey-keyring';
import { TrezorKeyring } from './trezor-keyring';
import { OneKeyKeyring as LegacyOneKeyKeyring } from '../onekey-keyring';
import type { TrezorBridge } from '../trezor-bridge';

const entropySource = 'onekey-device-id-123';

/**
 * Get a mock bridge for the OneKeyKeyring.
 *
 * @returns A mock bridge.
 */
function getMockBridge(): TrezorBridge {
  return {
    init: jest.fn(),
    dispose: jest.fn(),
    getPublicKey: jest.fn(),
    ethereumSignTransaction: jest.fn(),
    ethereumSignMessage: jest.fn(),
    ethereumSignTypedData: jest.fn(),
    model: undefined,
  } as unknown as TrezorBridge;
}

describe('OneKeyKeyring', () => {
  const createInnerKeyring = (): LegacyOneKeyKeyring => {
    return new LegacyOneKeyKeyring({ bridge: getMockBridge() });
  };

  describe('constructor', () => {
    it('extends TrezorKeyring', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper).toBeInstanceOf(TrezorKeyring);
    });

    it('sets the type to OneKey', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper.type).toBe(KeyringType.OneKey);
    });

    it('stores the entropy source', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyring({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper.entropySource).toBe(entropySource);
    });
  });
});
