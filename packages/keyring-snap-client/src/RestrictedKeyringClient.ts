import { KeyringRpcMethod } from '@metamask/keyring-api';

import type { KeyringClient } from './KeyringClient';

/**
 * Convert a tuple to a union.
 */
type TupleToUnion<Tuple extends readonly unknown[]> = Tuple[number];

/**
 * Extract the method name from a RPC method name.
 */
type KeyringRpcMethodToMethodName<RpcMethod extends string> =
  RpcMethod extends `keyring_${infer Method}` ? Method : never;

/**
 * Restricted methods list.
 */
export const RestrictedKeyringRpcMethod = [
  KeyringRpcMethod.CreateAccount,
  KeyringRpcMethod.GetAccount,
  KeyringRpcMethod.UpdateAccount,
  KeyringRpcMethod.DeleteAccount,
  KeyringRpcMethod.ExportAccount,
  KeyringRpcMethod.ListAccounts,
  KeyringRpcMethod.FilterAccountChains,
  KeyringRpcMethod.GetRequest,
  KeyringRpcMethod.ApproveRequest,
  KeyringRpcMethod.RejectRequest,
  KeyringRpcMethod.ListRequests,
] as const;

/**
 * Union of all restricted methods.
 */
type RestrictedKeyringMethod = KeyringRpcMethodToMethodName<
  TupleToUnion<typeof RestrictedKeyringRpcMethod>
>;

/**
 * A restricted client that can be used by companion dapp (some keyring methods are not
 * available in this context).
 */
export type RestrictedKeyringClient = Pick<
  KeyringClient,
  RestrictedKeyringMethod
>;
