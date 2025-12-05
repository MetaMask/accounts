import type { Sender } from '@metamask/keyring-snap-client';
import type { Json, JsonRpcRequest, SnapId } from '@metamask/snaps-sdk';
import type { HandlerType } from '@metamask/snaps-utils';

import type { KeyringInternalSnapClientMessenger } from './KeyringInternalSnapClientMessenger';

/**
 * Implementation of the `Sender` interface that can be used to send requests
 * to a Snap through a `Messenger`.
 */
export class SnapControllerMessengerSender implements Sender {
  readonly #snapId: SnapId;

  readonly #origin: string;

  readonly #messenger: KeyringInternalSnapClientMessenger;

  readonly #handler: HandlerType;

  /**
   * Create a new instance of `SnapControllerSender`.
   *
   * @param messenger - The `Messenger` instance used when dispatching controllers actions.
   * @param snapId - The ID of the Snap to use.
   * @param origin - The sender's origin.
   * @param handler - The handler type.
   */
  constructor(
    messenger: KeyringInternalSnapClientMessenger,
    snapId: SnapId,
    origin: string,
    handler: HandlerType,
  ) {
    this.#messenger = messenger;
    this.#snapId = snapId;
    this.#origin = origin;
    this.#handler = handler;
  }

  /**
   * Send a request to the Snap and return the response.
   *
   * @param request - JSON-RPC request to send to the Snap.
   * @returns A promise that resolves to the response of the request.
   */
  async send(request: JsonRpcRequest): Promise<Json> {
    return this.#messenger.call('SnapController:handleRequest', {
      snapId: this.#snapId,
      origin: this.#origin,
      handler: this.#handler,
      request,
    }) as Promise<Json>;
  }
}
