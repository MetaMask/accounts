import { KeyringType, type EntropySourceId } from '@metamask/keyring-api';

import type { OneKeyKeyring } from './onekey-keyring';
import { TrezorKeyringV2 } from './trezor-keyring-v2';

/**
 * Options for creating a OneKeyKeyringV2 instance.
 */
export type OneKeyKeyringV2Options = {
  legacyKeyring: OneKeyKeyring;
  entropySource: EntropySourceId;
};

/**
 * Concrete {@link KeyringV2} adapter for {@link OneKeyKeyring}.
 *
 * This wrapper extends {@link TrezorKeyringV2} since OneKeyKeyring extends
 * TrezorKeyring. The only difference is the keyring type identifier.
 */
export class OneKeyKeyringV2 extends TrezorKeyringV2 {
  constructor(options: OneKeyKeyringV2Options) {
    super({
      legacyKeyring: options.legacyKeyring,
      entropySource: options.entropySource,
      type: KeyringType.OneKey,
    });
  }
}
