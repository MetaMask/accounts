import type { Infer } from '@metamask/superstruct';
import { array, enums, nullable, number, string } from '@metamask/superstruct';
import { CaipChainIdStruct } from '@metamask/utils';

import { AssetStruct } from './asset';
import type { InferEquals } from '../superstruct';
import { object } from '../superstruct';
import type { Paginated } from '../utils';
import { UuidStruct } from '../utils';

/**
 * This struct represents a participant in a transaction.
 *
 * @example
 * ```ts
 * {
 *   address: '0x1234...',
 *   asset: {
 *     fungible: true,
 *     type: 'eip155:1/slip44:60',
 *     unit: 'ETH',
 *     amount: '0.01',
 *   },
 * },
 * ```
 *
 * @example
 * ```ts
 * {
 *   address: '0x1234...',
 *   asset: {
 *     fungible: false,
 *     id: 'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
 *   },
 * },
 * ```
 */
const ParticipantStruct = object({
  /**
   * Participant address.
   */
  address: string(),

  /**
   * Asset being transferred.
   */
  asset: nullable(AssetStruct),
});

/**
 * Fee types.
 */
export enum FeeType {
  /**
   * Transaction fee. It is the fee type if no other fee types applies.
   */
  Transaction = 'transaction',

  /**
   * Base fee. It is the minimum fee required to include a transaction in the
   * blockchain.
   *
   * For non-confirmed transactions, it must be the maximum base fee. For
   * confirmed transactions, it must be the actual base fee paid.
   */
  Base = 'base',

  /**
   * Priority fee. It is an optional fee used to prioritize the transaction.
   *
   * For non-confirmed transactions, it must be the maximum priority fee. For
   * confirmed transactions, it must be the actual priority fee paid.
   */
  Priority = 'priority',
}

const FeeStruct = object({
  /**
   * Fee type.
   */
  type: enums([
    `${FeeType.Transaction}`,
    `${FeeType.Base}`,
    `${FeeType.Priority}`,
  ]),

  /**
   * Asset used to pay for the fee.
   */
  asset: AssetStruct,
});

/**
 * Transaction statuses.
 *
 * The possible values are:
 *
 * - submitted: The transaction has been submitted but is not yet in the
 * blockchain. For example, it can be in the mempool.
 *
 * - unconfirmed: The transaction is in the blockchain but has not been
 * confirmed yet.
 *
 * - confirmed: The transaction has been confirmed.
 *
 * - failed: The transaction has failed. For example, it has been reverted.
 */
export enum TransactionStatus {
  Submitted = 'submitted',
  Unconfirmed = 'unconfirmed',
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
 * const tx = {
 *   id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
 *   chain: 'bip122:000000000019d6689c085ae165831e93',
 *   account: 'b9beb861-9761-4b97-89ce-d992be5f34da',
 *   status: 'confirmed',
 *   timestamp: 1716367781,
 *   type: 'send',
 *   from: [
 *     {
 *       address: 'bc1qrp0yzgkf8rawkuvdlhnjfj2fnjwm0m8727kgah',
 *       asset: {
 *         fungible: true,
 *         type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
 *         unit: 'BTC',
 *         amount: '0.1',
 *       },
 *     },
 *   ],
 *   to: [
 *     {
 *       address: 'bc1qrp0yzgkf8rawkuvdlhnjfj2fnjwm0m8727kgah',
 *       asset: {
 *         fungible: true,
 *         type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
 *         unit: 'BTC',
 *         amount: '0.1',
 *       },
 *     },
 *     {
 *       address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
 *       asset: {
 *         fungible: true,
 *         type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
 *         unit: 'BTC',
 *         amount: '0.1',
 *       },
 *     },
 *   ],
 *   "fees": [
 *     {
 *       type: 'transaction',
 *       asset: {
 *         fungible: true,
 *         type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
 *         unit: 'BTC',
 *         amount: '0.1',
 *       },
 *     },
 *   ],
 * };
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
   * Transaction status {@see TransactionStatus}.
   */
  status: enums([
    `${TransactionStatus.Submitted}`,
    `${TransactionStatus.Unconfirmed}`,
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
  fees: array(FeeStruct),

  /**
   * List of events related to the transaction.
   *
   * The events are tracked in a best-effort basis and may not be available for
   * all transactions.
   */
  events: array(
    object({
      /**
       * New status of the transaction.
       */
      status: enums([
        `${TransactionStatus.Submitted}`,
        `${TransactionStatus.Unconfirmed}`,
        `${TransactionStatus.Confirmed}`,
        `${TransactionStatus.Failed}`,
      ]),

      /**
       * UNIX timestamp of when the event was occurred.
       */
      timestamp: nullable(number()),
    }),
  ),
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
