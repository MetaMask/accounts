import type { EntropySourceId } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';

import { TrezorKeyringV2 } from './trezor-keyring';
import type { OneKeyKeyring } from '../onekey-keyring';

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
