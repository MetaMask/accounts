import { HdKeyring } from '@metamask/eth-hd-keyring';
import {
  array,
  assert,
  type Infer,
  literal,
  number,
  object,
  union,
} from '@metamask/superstruct';
import type { Hex } from '@metamask/utils';

/**
 * Based on the SLIP-10 coin type: https://github.com/satoshilabs/slips/pull/1983
 */
export const MONEY_DERIVATION_PATH = `m/44'/4392018'/0'/0`;

/**
 * The unique type identifier for the {@link MoneyKeyring}.
 */
export const MONEY_KEYRING_TYPE = 'Money Keyring';

/**
 * Struct for validating the serialized state of a {@link MoneyKeyring}.
 *
 * @property mnemonic - The mnemonic seed phrase as an array of byte values.
 * @property numberOfAccounts - The number of accounts; must be 0 or 1.
 * @property hdPath - The HD derivation path; must be {@link MONEY_DERIVATION_PATH}.
 */
const MoneyKeyringSerializedStateStruct = object({
  mnemonic: array(number()),
  numberOfAccounts: union([literal(0), literal(1)]),
  hdPath: literal(MONEY_DERIVATION_PATH),
});

/**
 * The serialized state of a {@link MoneyKeyring} instance.
 */
export type MoneyKeyringSerializedState = Infer<
  typeof MoneyKeyringSerializedStateStruct
>;

/**
 * Keyring used to create and manage Money Accounts. It extends the {@link HdKeyring}
 * and enforces a specific HD path and a limit on the number of accounts.
 */
export class MoneyKeyring extends HdKeyring {
  static override type: string = MONEY_KEYRING_TYPE;

  override readonly type: string = MONEY_KEYRING_TYPE;

  override readonly hdPath: string = MONEY_DERIVATION_PATH;

  override async serialize(): Promise<MoneyKeyringSerializedState> {
    const state = await super.serialize();
    assert(state, MoneyKeyringSerializedStateStruct);
    return state;
  }

  override async deserialize(
    state: MoneyKeyringSerializedState,
  ): Promise<void> {
    assert(state, MoneyKeyringSerializedStateStruct);
    return super.deserialize(state);
  }

  override async addAccounts(): Promise<Hex[]> {
    const existing = await this.getAccounts();
    if (existing.length > 0) {
      throw new Error('Money keyring already has an account');
    }
    return super.addAccounts(1);
  }
}
