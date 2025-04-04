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
 * Public methods list.
 */
export const KeyringPublicRpcMethod = [
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
 * Union of all public methods.
 */
type KeyringPublicMethod = KeyringRpcMethodToMethodName<
  TupleToUnion<typeof KeyringPublicRpcMethod>
>;

/**
 * A client that can be used by companion dapp. Only some keyring methods are
 * available with this client.
 */
export type KeyringPublicClient = Pick<KeyringClient, KeyringPublicMethod>;
