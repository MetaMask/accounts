import type { InferEquals } from '@metamask/keyring-utils';
import { exactOptional, object, UuidStruct } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import { array, enums, nullable, number, string } from '@metamask/superstruct';

import { AssetStruct } from './asset';
import { CaipChainIdStruct } from './caip';
import type { Paginated } from './pagination';

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
 *
 * @example
 * ```ts
 * {
 *   address: '0x1234...',
 *   asset: null,
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

/**
 * This struct represents a transaction fee.
 */
const FeeStruct = object({
  /**
   * Fee type {@see FeeType}.
   */
  type: enums([`${FeeType.Base}`, `${FeeType.Priority}`]),

  /**
   * Asset used to pay for the fee.
   */
  asset: AssetStruct,
});

/**
 * Transaction statuses.
 */
export enum TransactionStatus {
  /**
   * The transaction has been submitted but is not yet in the
   * blockchain. For example, it can be in the mempool.
   */
  Submitted = 'submitted',

  /**
   * The transaction is in the blockchain but has not been
   * confirmed yet.
   */
  Unconfirmed = 'unconfirmed',

  /**
   * The transaction has been confirmed.
   */
  Confirmed = 'confirmed',

  /**
   * The transaction has failed. For example, it has been reverted.
   */
  Failed = 'failed',
}

/**
 * Transaction types.
 */
export enum TransactionType {
  /**
   * The transaction was originated by the account. If the transaction
   * has a change output that goes back to the same account, it must be tagged
   * as a send transaction.
   */
  Send = 'send',

  /**
   * The transaction was received by the account, but originated by
   * another account.
   */
  Receive = 'receive',

  /**
   * The transaction is a swap. It decreases the balance of one asset and
   * increases the balance of another asset in a single transaction.
   *
   * A swap transaction must be originated by the account.
   */
  Swap = 'swap',

  /**
   * Represents an outgoing bridge transaction, transferring assets from
   * the account to another blockchain.
   */
  BridgeSend = 'bridge:send',

  /**
   * Represents an incoming bridge transaction, transferring assets from
   * another blockchain to the account.
   */
  BridgeReceive = 'bridge:receive',

  /**
   * Represents a stake deposit transaction.
   */
  StakeDeposit = 'stake:deposit',

  /**
   * Represents a stake withdrawal transaction.
   */
  StakeWithdraw = 'stake:withdraw',

  /**
   * The transaction type is unknown. It's not possible to determine the
   * transaction type based on the information available.
   */
  Unknown = 'unknown',
}

/**
 * Security alert response values from the Security Alert API.
 */
export enum SecurityAlertResponse {
  /**
   * The transaction is considered safe with no detected security issues.
   */
  Benign = 'Benign',

  /**
   * The transaction has potential security concerns that warrant user attention.
   */
  Warning = 'Warning',

  /**
   * The transaction has been identified as malicious and should be avoided.
   */
  Malicious = 'Malicious',
}

/**
 * This struct represents additional transaction details.
 *
 * @example
 * ```ts
 * {
 *   origin: 'https://dapp.example.com',
 *   securityAlertResponse: 'Benign',
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   origin: 'metamask',
 *   securityAlertResponse: 'Warning',
 * }
 * ```
 */
export const TransactionDetailsStruct = object({
  /**
   * Origin of the original transaction request.
   *
   * This can be either 'metamask' for internally initiated transactions, or a URL
   * (e.g., 'https://dapp.example.com') for dapp-initiated transactions.
   */
  origin: exactOptional(string()),

  /**
   * Response from the Security Alert API indicating the security assessment of the
   * transaction.
   */
  securityAlertResponse: exactOptional(
    enums([
      `${SecurityAlertResponse.Benign}`,
      `${SecurityAlertResponse.Warning}`,
      `${SecurityAlertResponse.Malicious}`,
    ]),
  ),
});

/**
 * This struct represents a transaction event.
 */
export const TransactionEventStruct = object({
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
   * UNIX timestamp of when the event occurred.
   */
  timestamp: nullable(number()),
});

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
 *   fees: [
 *     {
 *       type: 'priority',
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
   * Transaction type {@see TransactionType}. This will be used by MetaMask to enrich the transaction
   * details on the UI.
   */
  type: enums([
    `${TransactionType.Send}`,
    `${TransactionType.Receive}`,
    `${TransactionType.Swap}`,
    `${TransactionType.BridgeSend}`,
    `${TransactionType.BridgeReceive}`,
    `${TransactionType.StakeDeposit}`,
    `${TransactionType.StakeWithdraw}`,
    `${TransactionType.Unknown}`,
  ]),

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
   * List of events related to the transaction {@see TransactionEventStruct}.
   *
   * The events are tracked in a best-effort basis and may not be available for
   * all transactions.
   */
  events: array(TransactionEventStruct),

  /**
   * Additional transaction details {@see TransactionDetailsStruct}.
   *
   * Contains contextual information about the transaction such as its origin and
   * security assessment. This field is optional and may not be present for all
   * transactions.
   */
  details: exactOptional(TransactionDetailsStruct),
});

/**
 * Transaction details object.
 *
 * See {@link TransactionDetailsStruct}.
 */
export type TransactionDetails = Infer<typeof TransactionDetailsStruct>;

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
 *
 * @example
 * ```ts
 * {
 *   data: [
 *     {
 *       // Transaction object
 *     }
 *   ],
 *   next: null, // No more results
 * }**
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
