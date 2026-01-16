import {
  array,
  literal,
  object,
  string,
  type Infer,
} from '@metamask/superstruct';

export enum SnapManageAccountsMethod {
  GetSelectedAccounts = 'getSelectedAccounts',
}

export const GetSelectedAccountsRequestStruct = object({
  method: literal(SnapManageAccountsMethod.GetSelectedAccounts),
});

export const GetSelectedAccountsResponseStruct = array(string());

export type GetSelectedAccountsResponse = Infer<
  typeof GetSelectedAccountsResponseStruct
>;
