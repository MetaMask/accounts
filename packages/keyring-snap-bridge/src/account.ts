import { KeyringAccountStruct } from '@metamask/keyring-api';
import { object, exactOptional } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';

/**
 * A `KeyringAccount` with some optional fields which can be used to keep
 * the retro-compatility with older version of keyring accounts/events.
 */
export const KeyringAccountV1Struct = object({
  // Derive from a `KeyringAccount`.
  ...KeyringAccountStruct.schema,

  // This has been introduced since: @metamask/keyring-api@>11
  scopes: exactOptional(KeyringAccountStruct.schema.scopes),
});

export type KeyringAccountV1 = Infer<typeof KeyringAccountV1Struct>;
