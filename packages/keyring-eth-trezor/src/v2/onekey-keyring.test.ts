import { KeyringType } from '@metamask/keyring-api/v2';

import { OneKeyKeyringV2 } from './onekey-keyring';
import { TrezorKeyringV2 } from './trezor-keyring';
import { OneKeyKeyring } from '../onekey-keyring';
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

describe('OneKeyKeyringV2', () => {
  const createInnerKeyring = (): OneKeyKeyring => {
    return new OneKeyKeyring({ bridge: getMockBridge() });
  };

  describe('constructor', () => {
    it('extends TrezorKeyringV2', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper).toBeInstanceOf(TrezorKeyringV2);
    });

    it('sets the type to OneKey', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper.type).toBe(KeyringType.OneKey);
    });

    it('stores the entropy source', () => {
      const inner = createInnerKeyring();
      const wrapper = new OneKeyKeyringV2({
        legacyKeyring: inner,
        entropySource,
      });

      expect(wrapper.entropySource).toBe(entropySource);
    });
  });
});
