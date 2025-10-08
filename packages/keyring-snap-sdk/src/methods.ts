import {
  array,
  literal,
  object,
  string,
  type Infer,
} from '@metamask/superstruct';

export enum KeyringMethod {
  GetSelectedAccounts = 'getSelectedAccounts',
}

export const GetSelectedAccountsRequestStruct = object({
  method: literal(KeyringMethod.GetSelectedAccounts),
});

export const GetSelectedAccountsReponseStruct = array(string());

export type GetSelectedAccountsResponse = Infer<
  typeof GetSelectedAccountsReponseStruct
>;
