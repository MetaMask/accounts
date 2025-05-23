import type { KeyringRequest } from '@metamask/keyring-api';
import {
  KeyringRequestStruct,
  KeyringResponseStruct,
} from '@metamask/keyring-api';
import { omit, type Infer } from '@metamask/superstruct';

/**
 * Keyring request (v1).
 */
export const KeyringRequestV1Struct = omit(KeyringRequestStruct, ['origin']);

export type KeyringRequestV1 = Infer<typeof KeyringRequestV1Struct>;

/**
 * Response to a call to `submitRequest` (v1).
 */
export const KeyringResponseV1Struct = KeyringResponseStruct;

export type KeyringResponseV1 = Infer<typeof KeyringResponseV1Struct>;

export const SubmitRequestResponseV1Struct = KeyringResponseV1Struct;

/**
 * Converts a keyring request to a keyring request v1.
 *
 * @param request - A keyring request.
 * @returns A keyring request v1.
 */
export function toKeyringRequestV1(request: KeyringRequest): KeyringRequestV1 {
  const { origin, ...requestV1 } = request;

  return requestV1;
}
