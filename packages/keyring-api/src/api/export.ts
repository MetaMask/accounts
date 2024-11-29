import type { Infer } from '@metamask/superstruct';
import { record, string } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const KeyringAccountDataStruct = record(string(), JsonStruct);

/**
 * Response to a call to `exportAccount`.
 *
 * The exact response depends on the keyring implementation.
 */
export type KeyringAccountData = Infer<typeof KeyringAccountDataStruct>;
