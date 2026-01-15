import type { KeyringRequest } from '@metamask/keyring-api';
import {
  KeyringRequestStruct,
  KeyringResponseStruct,
} from '@metamask/keyring-api';
import { omit, type Infer } from '@metamask/superstruct';

/**
 * Keyring request without `origin` support.
 */
export const KeyringRequestWithoutOriginStruct = omit(KeyringRequestStruct, [
  'origin',
]);

export type KeyringRequestWithoutOrigin = Infer<
  typeof KeyringRequestWithoutOriginStruct
>;

/**
 * Response to a call to `submitRequest` (v1).
 */
export const KeyringResponseWithoutOriginStruct = KeyringResponseStruct;

export type KeyringResponseWithoutOrigin = Infer<
  typeof KeyringResponseWithoutOriginStruct
>;

export const SubmitRequestResponseV1Struct = KeyringResponseWithoutOriginStruct;

/**
 * Converts a keyring request to a keyring request v1.
 *
 * @param request - A keyring request.
 * @returns A keyring request v1.
 */
export function toKeyringRequestWithoutOrigin(
  request: KeyringRequest,
): KeyringRequestWithoutOrigin {
  const { origin, ...requestV1 } = request;

  return requestV1;
}
