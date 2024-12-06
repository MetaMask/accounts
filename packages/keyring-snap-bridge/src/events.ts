import { object, omit, string, array } from '@metamask/superstruct';
import { exactOptional } from '@metamask/keyring-utils';
import { AccountCreatedEventStruct as OriginalAccountCreatedEventStruct, AccountUpdatedEventStruct as OriginalAccountUpdatedEventStruct, AccountDeletedEventStruct, RequestApprovedEventStruct, RequestRejectedEventStruct } from '@metamask/keyring-api';

export const AccountCreatedEventStruct = object({
  ...OriginalAccountCreatedEventStruct.schema,

  params: object({
    ...OriginalAccountCreatedEventStruct.schema.params.schema,
    account: object({
      ...omit(
        OriginalAccountCreatedEventStruct.schema.params.schema.account,
        ['scopes']
      ).schema,
      scopes: exactOptional(
        OriginalAccountCreatedEventStruct.schema.params.schema.account.schema.scopes,
      )
    }),
  }),
});

export const AccountUpdatedEventStruct = object({
  ...OriginalAccountUpdatedEventStruct.schema,

  params: object({
    ...OriginalAccountUpdatedEventStruct.schema.params.schema,
    account: object({
      ...omit(
        OriginalAccountUpdatedEventStruct.schema.params.schema.account,
        ['scopes']
      ).schema,
      scopes: exactOptional(
        OriginalAccountUpdatedEventStruct.schema.params.schema.account.schema.scopes,
      )
    }),
  }),
});

export {
  AccountDeletedEventStruct,
  RequestApprovedEventStruct,
  RequestRejectedEventStruct,
};
