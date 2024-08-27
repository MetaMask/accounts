/**
 * Supported keyring events.
 */
export enum KeyringEvent {
  // Account events
  AccountCreated = 'notify:accountCreated',
  AccountUpdated = 'notify:accountUpdated',
  AccountDeleted = 'notify:accountDeleted',

  // Request events
  RequestApproved = 'notify:requestApproved',
  RequestRejected = 'notify:requestRejected',
}
