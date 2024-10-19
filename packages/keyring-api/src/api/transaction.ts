import type { Infer } from '@metamask/superstruct';
import {
  array,
  enums,
  literal,
  nullable,
  number,
  string,
  union,
} from '@metamask/superstruct';
import {
  CaipChainIdStruct,
  CaipAssetIdStruct,
  CaipAssetTypeStruct,
} from '@metamask/utils';

import type { InferEquals } from '../superstruct';
import { object } from '../superstruct';
import type { Paginated } from '../utils';
import { StringNumberStruct, UuidStruct } from '../utils';

/**
 * This struct represents an asset. The `fungible` property is used to tag the
 * union type and allow the following pattern:
 *
 * ```ts
 * if (asset.fungible) {
 *   // Use asset.type and asset.unit
 * } else {
 *   // Use asset.id
 * }
 * ```
 *
 * @example
 * ```ts
 * asset: {
 *   fungible: true,
 *   type: 'eip155:1/slip44:60',
 *   unit: 'ETH',
 * },
 * ```
 *
 * @example
 * ```ts
 * asset: {
 *   fungible: false,
 *   id: 'hedera:mainnet/nft:0.0.55492/12',
 * },
 * ```
 */
const AssetStruct = union([
  object({
    /**
     * It is a fungible asset.
     */
    fungible: literal(true),

    /**
     * Asset type (CAIP-19).
     */
    type: CaipAssetTypeStruct,

    /**
     * Unit of the asset. This has to be one of the supported units for the
     * asset, as defined by MetaMask.
     */
    unit: string(),
  }),
  object({
    /**
     * It is a non-fungible asset.
     */
    fungible: literal(false),

    /**
     * Asset ID (CAIP-19).
     */
    id: CaipAssetIdStruct,
  }),
]);

/**
 * This struct represents an amount of an asset.
 *
 * @example
 * ```ts
 * fee: {
 *   amount: '0.01',
 *   asset: {
 *     fungible: true,
 *     type: 'eip155:1/slip44:60',
 *     unit: 'ETH',
 *   },
 * },
 * ```
 */
const AmountStruct = object({
  /**
   * Amount in decimal string format.
   */
  amount: StringNumberStruct,

  /**
   * Asset information.
   */
  asset: AssetStruct,
});

/**
 * This struct represents a participant in a transaction.
 *
 * @example
 * ```ts
 * from: [
 *   {
 *     address: '0x1234...',
 *     amount: '0.01',
 *     asset: {
 *       fungible: true,
 *       type: 'eip155:1/slip44:60',
 *       unit: 'ETH',
 *     },
 *   },
 * ],
 * ```
 */
const ParticipantStruct = object({
  /**
   * Amount transferred from or to the participant.
   */
  ...AmountStruct.schema,

  /**
   * Participant address.
   */
  address: string(),
});

/**
 * Transaction statuses.
 */
export enum TransactionStatus {
  Submitted = 'submitted',
  Pending = 'pending',
  Confirmed = 'confirmed',
  Failed = 'failed',
}

/**
 * Transaction types.
 */
export enum TransactionType {
  Send = 'send',
  Receive = 'receive',
}

/**
 * This struct represents a blockchain transaction.
 *
 * @example
 * ```ts
 * {
 *   "id": "f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6",
 *   "chain": "bip122:000000000019d6689c085ae165831e93",
 *   "account": "b9beb861-9761-4b97-89ce-d992be5f34da",
 *   "status": "confirmed",
 *   "timestamp": 1716367781,
 *   "type": "send",
 *   "from": [
 *     {
 *       "address": "bc1qrp0yzgkf8rawkuvdlhnjfj2fnjwm0m8727kgah",
 *       "amount": "0.2001",
 *       "asset": {
 *         "fungible": true,
 *         "type": "bip122:000000000019d6689c085ae165831e93/slip44:0",
 *         "unit": "BTC"
 *       }
 *     }
 *   ],
 *   "to": [
 *     {
 *       "address": "bc1qrp0yzgkf8rawkuvdlhnjfj2fnjwm0m8727kgah",
 *       "amount": "0.1",
 *       "asset": {
 *         "fungible": true,
 *         "type": "bip122:000000000019d6689c085ae165831e93/slip44:0",
 *         "unit": "BTC"
 *       }
 *     },
 *     {
 *       "address": "bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k",
 *       "amount": "0.1",
 *       "asset": {
 *         "fungible": true,
 *         "type": "bip122:000000000019d6689c085ae165831e93/slip44:0",
 *         "unit": "BTC"
 *       }
 *     }
 *   ],
 *   "fee": {
 *     "amount": "0.0001",
 *     "asset": {
 *       "fungible": true,
 *       "type": "bip122:000000000019d6689c085ae165831e93/slip44:0",
 *       "unit": "BTC"
 *     }
 *   }
 * }
 * ```
 */
export const TransactionStruct = object({
  /**
   * Chain-specific transaction ID.
   */
  id: string(),

  /**
   * Chain ID (CAIP-2).
   */
  chain: CaipChainIdStruct,

  /**
   * Account ID (UUIDv4).
   */
  account: UuidStruct,

  /**
   * Transaction status.
   *
   * The possible values are:
   *
   * - submitted: The transaction has been submitted but is not yet in the
   * blockchain. For example, it can be in the mempool.
   *
   * - pending: The transaction is in the blockchain but has not been
   * confirmed yet.
   *
   * - confirmed: The transaction has been confirmed.
   *
   * - failed: The transaction has failed. For example, it has been reverted.
   */
  status: enums([
    `${TransactionStatus.Submitted}`,
    `${TransactionStatus.Pending}`,
    `${TransactionStatus.Confirmed}`,
    `${TransactionStatus.Failed}`,
  ]),

  /**
   * UNIX timestamp of when the transaction was added to the blockchain. The
   * timestamp can be null if the transaction has not been included in the
   * blockchain yet.
   */
  timestamp: nullable(number()),

  /**
   * Transaction type. This will be used by MetaMask to enrich the transaction
   * details on the UI.
   *
   * The possible values are:
   *
   * - send: The transaction was originated by the account. If the transaction
   * has a change output that goes back to the same account, it must be tagged
   * as a send transaction.
   *
   * - receive: The transaction was received by the account, but originated by
   * another account.
   */
  type: enums([`${TransactionType.Send}`, `${TransactionType.Receive}`]),

  /**
   * Transaction sender addresses and amounts.
   */
  from: array(ParticipantStruct),

  /**
   * Transaction receiver addresses and amounts.
   */
  to: array(ParticipantStruct),

  /**
   * Total transaction fee.
   */
  fee: AmountStruct,
});

/**
 * Transaction object.
 *
 * See {@link TransactionStruct}.
 */
export type Transaction = Infer<typeof TransactionStruct>;

/**
 * This struct represents a page of transactions.
 *
 * @example
 * ```ts
 * {
 *   data: [
 *     {
 *       // Transaction object
 *     }
 *   ],
 *   next: 'c3y1Q6QtqtstbxKX+oqVdEW6',
 * }
 * ```
 */
export const TransactionsPageStruct = object({
  /**
   * List of transactions.
   */
  data: array(TransactionStruct),

  /**
   * Next cursor to iterate over the results. If null, there are no more
   * results.
   */
  next: nullable(string()),
});

/**
 * Transactions page object.
 *
 * See {@link TransactionsPageStruct}.
 */
export type TransactionsPage = InferEquals<
  typeof TransactionsPageStruct,
  Paginated<Transaction>
>;
