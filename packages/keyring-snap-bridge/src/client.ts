// This is a internal file, no need to export this one out of this package scope.

import {
  KeyringRequestStruct,
  KeyringResponseStruct,
  KeyringRpcMethod,
} from '@metamask/keyring-api';
import { KeyringInternalSnapClient } from '@metamask/keyring-internal-snap-client';
import { strictMask } from '@metamask/keyring-utils';
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
 * A specific client to handle v1 requests.
 */
export class KeyringInternalSnapClientV1 {
  readonly #client: KeyringInternalSnapClient;

  constructor(client: KeyringInternalSnapClient) {
    this.#client = client;
  }

  static from(client: KeyringInternalSnapClient): KeyringInternalSnapClientV1 {
    return new KeyringInternalSnapClientV1(client);
  }

  async submitRequest(request: KeyringRequestV1): Promise<KeyringResponseV1> {
    return strictMask(
      await this.#client.send({
        method: KeyringRpcMethod.SubmitRequest,
        params: request,
      }),
      SubmitRequestResponseV1Struct,
    );
  }
}

export { KeyringInternalSnapClient };
