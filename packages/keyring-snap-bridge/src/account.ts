import { KeyringAccountStruct } from '@metamask/keyring-api';
import { omit, type Infer } from '@metamask/superstruct';

/**
 * A `KeyringAccount` with some optional fields which can be used to keep
 * the retro-compatility with older version of keyring accounts/events.
 */
export const KeyringAccountV1Struct = omit(KeyringAccountStruct, ['scopes']);

export type KeyringAccountV1 = Infer<typeof KeyringAccountV1Struct>;
