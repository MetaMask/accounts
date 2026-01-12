import type { KeyringRequest } from '@metamask/keyring-api';
import {
  KeyringRequestStruct,
  KeyringResponseStruct,
} from '@metamask/keyring-api';
import { omit, type Infer } from '@metamask/superstruct';

/**
 * Keyring request (v1).
 */
export const LegacyKeyringRequestStruct = omit(KeyringRequestStruct, ['origin']);

export type LegacyKeyringRequest = Infer<typeof LegacyKeyringRequestStruct>;

/**
 * Response to a call to `submitRequest` (v1).
 */
export const LegacyKeyringResponseStruct = KeyringResponseStruct;

export type LegacyKeyringResponse = Infer<typeof LegacyKeyringResponseStruct>;

export const SubmitRequestResponseV1Struct = LegacyKeyringResponseStruct;

/**
 * Converts a keyring request to a keyring request v1.
 *
 * @param request - A keyring request.
 * @returns A keyring request v1.
 */
export function toLegacyKeyringRequest(request: KeyringRequest): LegacyKeyringRequest {
  const { origin, ...requestV1 } = request;

  return requestV1;
}
