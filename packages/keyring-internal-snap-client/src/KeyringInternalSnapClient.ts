import type { RestrictedMessenger } from '@metamask/base-controller';
import { KeyringClient, type Sender } from '@metamask/keyring-snap-client';
import type { JsonRpcRequest } from '@metamask/keyring-utils';
import type { HandleSnapRequest } from '@metamask/snaps-controllers';
import type { SnapId } from '@metamask/snaps-sdk';
import type { HandlerType } from '@metamask/snaps-utils';
import type { Json } from '@metamask/utils';

// We only need to dispatch Snap request to the Snaps controller for now.
type AllowedActions = HandleSnapRequest;

/**
 * A restricted-`Messenger` used by `KeyringInternalSnapClient` to dispatch
 * internal Snap requests.
 */
export type KeyringInternalSnapClientMessenger = RestrictedMessenger<
  'KeyringInternalSnapClient',
  AllowedActions,
  never,
  AllowedActions['type'],
  never
>;

/**
 * Implementation of the `Sender` interface that can be used to send requests
 * to a Snap through a `Messenger`.
 */
class SnapControllerMessengerSender implements Sender {
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

/**
 * A `KeyringClient` that allows the communication with a Snap through a
 * `Messenger`.
 */
export class KeyringInternalSnapClient extends KeyringClient {
  readonly #messenger: KeyringInternalSnapClientMessenger;

  /**
   * Create a new instance of `KeyringInternalSnapClient`.
   *
   * The `handlerType` argument has a hard-coded default `string` value instead
   * of a `HandlerType` value to prevent the `@metamask/snaps-utils` module
   * from being required at runtime.
   *
   * @param args - Constructor arguments.
   * @param args.messenger - The `KeyringInternalSnapClientMessenger` instance to use.
   * @param args.snapId - The ID of the Snap to use (default: `'undefined'`).
   * @param args.origin - The sender's origin (default: `'metamask'`).
   * @param args.handler - The handler type (default: `'onKeyringRequest'`).
   */
  constructor({
    messenger,
    snapId = 'undefined' as SnapId,
    origin = 'metamask',
    handler = 'onKeyringRequest' as HandlerType,
  }: {
    messenger: KeyringInternalSnapClientMessenger;
    snapId?: SnapId;
    origin?: string;
    handler?: HandlerType;
  }) {
    super(
      new SnapControllerMessengerSender(messenger, snapId, origin, handler),
    );
    this.#messenger = messenger;
  }

  /**
   * Create a new instance of `KeyringInternalSnapClient` with the specified
   * `snapId`.
   *
   * @param snapId - The ID of the Snap to use in the new instance.
   * @returns A new instance of `KeyringInternalSnapClient` with the
   * specified Snap ID.
   */
  withSnapId(snapId: SnapId): KeyringInternalSnapClient {
    return new KeyringInternalSnapClient({
      messenger: this.#messenger,
      snapId,
    });
  }

  /**
   * Send a request to the snap and return the response.
   *
   * @param partial - A partial JSON-RPC request (method and params).
   * @returns A promise that resolves to the response to the request.
   */
  public async send(
    partial: Omit<JsonRpcRequest, 'jsonrpc' | 'id'>,
  ): Promise<Json> {
    // We mainly make this method public only for internal use, the "public KeyringClient" won't expose
    // it, unless your extending it explicitly.
    return super.send(partial);
  }
}
