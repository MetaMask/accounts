import { boolean, literal, string } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { KeyringAccountStruct } from '../api';
import { KeyringEvent } from '../events';
import { exactOptional, object } from '../superstruct';
import { UuidStruct } from '../utils';

export const AccountCreatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountCreated}`),
  params: object({
    /**
     * New account object.
     */
    account: KeyringAccountStruct,

    /**
     * Account name suggestion provided to the MetaMask client.
     *
     * The keyring can suggest a name for the account, but it's up to the
     * client to decide whether to use it. The keyring won't be informed if the
     * client decides to use a different name.
     */
    accountNameSuggestion: exactOptional(string()),

    /**
     * Instructs MetaMask to display the add account confirmation dialog in the UI.
     * **Note:** This is not guaranteed to be honored by the MetaMask client.
     */
    displayConfirmation: exactOptional(boolean()),
  }),
});

export const AccountUpdatedEventStruct = object({
  method: literal(`${KeyringEvent.AccountUpdated}`),
  params: object({
    /**
     * Updated account object.
     */
    account: KeyringAccountStruct,
  }),
});

export const AccountDeletedEventStruct = object({
  method: literal(`${KeyringEvent.AccountDeleted}`),
  params: object({
    /**
     * Deleted account ID.
     */
    id: UuidStruct,
  }),
});

export const RequestApprovedEventStruct = object({
  method: literal(`${KeyringEvent.RequestApproved}`),
  params: object({
    /**
     * Request ID.
     */
    id: UuidStruct,

    /**
     * Request result.
     */
    result: JsonStruct,
  }),
});

export const RequestRejectedEventStruct = object({
  method: literal(`${KeyringEvent.RequestRejected}`),
  params: object({
    /**
     * Request ID.
     */
    id: UuidStruct,
  }),
});
