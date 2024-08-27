import type { Infer } from '@metamask/superstruct';
import { literal, string, union } from '@metamask/superstruct';
import { JsonStruct } from '@metamask/utils';

import { exactOptional, object } from '../superstruct';

export const KeyringResponseStruct = union([
  object({
    /**
     * Pending flag.
     *
     * Setting the pending flag to true indicates that the request will be
     * handled asynchronously. The keyring must be called with `approveRequest`
     * or `rejectRequest` to resolve the request.
     */
    pending: literal(true),

    /**
     * Redirect URL.
     *
     * If present in the response, MetaMask will display a confirmation dialog
     * with a link to the redirect URL. The user can choose to follow the link
     * or cancel the request.
     */
    redirect: exactOptional(
      object({
        message: exactOptional(string()),
        url: exactOptional(string()),
      }),
    ),
  }),
  object({
    /**
     * Pending flag.
     *
     * Setting the pending flag to false indicates that the request will be
     * handled synchronously. The keyring must return the result of the
     * request execution.
     */
    pending: literal(false),

    /**
     * Request result.
     */
    result: JsonStruct,
  }),
]);

/**
 * Response to a call to `submitRequest`.
 *
 * Keyring implementations must return a response with `pending: true` if the
 * request will be handled asynchronously. Otherwise, the response must contain
 * the result of the request and `pending: false`.
 *
 * In the asynchronous case, the keyring can return a redirect URL and message
 * to be shown to the user. The user can choose to follow the link or cancel
 * the request. The main use case for this is to redirect the user to the snap
 * dapp to review the request.
 */
export type KeyringResponse = Infer<typeof KeyringResponseStruct>;
