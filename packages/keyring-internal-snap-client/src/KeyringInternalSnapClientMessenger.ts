import type { Messenger } from '@metamask/messenger';
import type { HandleSnapRequest } from '@metamask/snaps-controllers';

// We only need to dispatch Snap request to the Snaps controller for now.
type AllowedActions = HandleSnapRequest;

/**
 * A restricted-`Messenger` used by `KeyringInternalSnapClient` to dispatch
 * internal Snap requests.
 */
export type KeyringInternalSnapClientMessenger = Messenger<
  'KeyringInternalSnapClient',
  AllowedActions
>;
