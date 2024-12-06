import { exactOptional, object, UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, record, string, union } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

export const KeyringRequestStruct = object({
  /**
   * Keyring request ID (UUIDv4).
   */
  id: UuidStruct,

  /**
   * Request's scope (CAIP-2 chain ID).
   */
  scope: string(),

  /**
   * Account ID (UUIDv4).
   */
  account: UuidStruct,

  /**
   * Inner request sent by the client application.
   */
  request: object({
    method: string(),
    params: exactOptional(
      union([array(JsonStruct), record(string(), JsonStruct)]),
    ),
  }),
});

/**
 * Keyring request.
 *
 * Represents a request made to the keyring for account-related operations.
 */
export type KeyringRequest = Infer<typeof KeyringRequestStruct>;
