/**
 * Keyring RPC methods used by the API.
 */
export enum KeyringRpcMethod {
  ListAccounts = 'keyring_listAccounts',
  GetAccount = 'keyring_getAccount',
  CreateAccount = 'keyring_createAccount',
  GetAccountBalances = 'keyring_getAccountBalances',
  FilterAccountChains = 'keyring_filterAccountChains',
  UpdateAccount = 'keyring_updateAccount',
  DeleteAccount = 'keyring_deleteAccount',
  ExportAccount = 'keyring_exportAccount',
  ListRequests = 'keyring_listRequests',
  GetRequest = 'keyring_getRequest',
  SubmitRequest = 'keyring_submitRequest',
  ApproveRequest = 'keyring_approveRequest',
  RejectRequest = 'keyring_rejectRequest',
}

/**
 * Check if a method is a keyring RPC method.
 *
 * @param method - Method to check.
 * @returns Whether the method is a keyring RPC method.
 */
export function isKeyringRpcMethod(method: string): boolean {
  return Object.values(KeyringRpcMethod).includes(method as KeyringRpcMethod);
}
