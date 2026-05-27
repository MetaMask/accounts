import type { EntropySourceId } from '@metamask/keyring-api';
import { KeyringType } from '@metamask/keyring-api/v2';

import type { OneKeyKeyring as LegacyOneKeyKeyring } from '../onekey-keyring';
import { TrezorKeyring } from './trezor-keyring';

/**
 * Options for creating a OneKeyKeyring instance.
 */
export type OneKeyKeyringOptions = {
  legacyKeyring: LegacyOneKeyKeyring;
  entropySource: EntropySourceId;
};

/**
 * Concrete {@link Keyring} adapter for {@link OneKeyKeyring}.
 *
 * This wrapper extends {@link TrezorKeyring} since OneKeyKeyring extends
 * TrezorKeyring. The only difference is the keyring type identifier.
 */
export class OneKeyKeyring extends TrezorKeyring {
  constructor(options: OneKeyKeyringOptions) {
    super({
      legacyKeyring: options.legacyKeyring,
      entropySource: options.entropySource,
      type: KeyringType.OneKey,
    });
  }
}
