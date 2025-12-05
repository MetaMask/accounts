import { KeyringClientV2 } from '@metamask/keyring-snap-client';
import type { SnapId } from '@metamask/snaps-sdk';
import type { HandlerType } from '@metamask/snaps-utils';

import type { KeyringInternalSnapClientMessenger } from '../KeyringInternalSnapClientMessenger';
import { SnapControllerMessengerSender } from '../SnapControllerMessengerSender';

/**
 * A `KeyringClient` that allows the communication with a Snap through a
 * `Messenger`.
 */
export class KeyringInternalSnapClientV2 extends KeyringClientV2 {
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
  withSnapId(snapId: SnapId): KeyringInternalSnapClientV2 {
    return new KeyringInternalSnapClientV2({
      messenger: this.#messenger,
      snapId,
    });
  }
}
