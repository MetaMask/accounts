import type { RestrictedControllerMessenger } from '@metamask/base-controller';
import type { HandleSnapRequest, GetSnap } from '@metamask/snaps-controllers';

export type SnapKeyringAllowedActions = HandleSnapRequest | GetSnap;

export type SnapKeyringAllowedEvents = never;

export type SnapKeyringMessenger = RestrictedControllerMessenger<
  'SnapKeyringMessenger',
  SnapKeyringAllowedActions,
  SnapKeyringAllowedEvents,
  SnapKeyringAllowedActions['type'],
  SnapKeyringAllowedEvents['type']
>;
