import {
  AccountCreatedEventStruct as OriginalAccountCreatedEventStruct,
  AccountUpdatedEventStruct as OriginalAccountUpdatedEventStruct,
  AccountDeletedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
  KeyringAccountStruct,
} from '@metamask/keyring-api';
import { object } from '@metamask/keyring-utils';
import { union } from '@metamask/superstruct';

import { KeyringAccountV1Struct } from './account';

export const AccountCreatedEventStruct = object({
  ...OriginalAccountCreatedEventStruct.schema,

  params: object({
    ...OriginalAccountCreatedEventStruct.schema.params.schema,
    account: union([KeyringAccountV1Struct, KeyringAccountStruct]),
  }),
});

export const AccountUpdatedEventStruct = object({
  ...OriginalAccountUpdatedEventStruct.schema,

  params: object({
    ...OriginalAccountUpdatedEventStruct.schema.params.schema,
    account: union([KeyringAccountV1Struct, KeyringAccountStruct]),
  }),
});

// Re-export the all keyring events, so we don't have to mix between events coming
// from `@metamask/keyring-api` and the local ones:
export {
  AccountDeletedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
};
