import { HdKeyring } from '@metamask/eth-hd-keyring';
import type { Keyring } from '@metamask/keyring-utils';
import {
  assert,
  type Infer,
  literal,
  object,
  string as stringStruct,
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
 * Callback used to resolve a mnemonic from an entropy source ID.
 *
 * @param entropySource - The entropy source identifier.
 * @returns The mnemonic as an array of UTF-8 byte values.
 */
export type GetMnemonicCallback = (entropySource: string) => Promise<number[]>;

/**
 * Options for constructing a {@link MoneyKeyring}.
 *
 * @property getMnemonic - Callback to resolve the mnemonic from an entropy source ID.
 */
export type MoneyKeyringOptions = {
  getMnemonic: GetMnemonicCallback;
};

/**
 * Struct for validating the serialized state of a {@link MoneyKeyring}.
 *
 * @property entropySource - The entropy source identifier.
 * @property numberOfAccounts - The number of accounts; must be 0 or 1.
 */
const MoneyKeyringSerializedStateStruct = object({
  entropySource: stringStruct(),
  numberOfAccounts: union([literal(0), literal(1)]),
});

/**
 * The serialized state of a {@link MoneyKeyring} instance.
 */
export type MoneyKeyringSerializedState = Infer<
  typeof MoneyKeyringSerializedStateStruct
>;

/**
 * Keyring used to create and manage Money Accounts. It wraps an inner {@link HdKeyring}
 * and enforces a specific HD path and a limit on the number of accounts. The mnemonic
 * is never stored in the serialized state; instead, it is resolved at deserialization
 * time via a callback.
 */
export class MoneyKeyring implements Keyring {
  static type: string = MONEY_KEYRING_TYPE;

  readonly type: string = MONEY_KEYRING_TYPE;

  readonly #getMnemonic: GetMnemonicCallback;

  #entropySource: string | undefined;

  readonly #inner: HdKeyring;

  constructor({ getMnemonic }: MoneyKeyringOptions) {
    this.#getMnemonic = getMnemonic;
    this.#inner = new HdKeyring();
  }

  get entropySource(): string | undefined {
    return this.#entropySource;
  }

  async serialize(): Promise<MoneyKeyringSerializedState> {
    const innerState = await this.#inner.serialize();
    const state = {
      entropySource: this.#entropySource,
      numberOfAccounts: innerState.numberOfAccounts,
    };
    assert(state, MoneyKeyringSerializedStateStruct);
    return state;
  }

  async deserialize(state: MoneyKeyringSerializedState): Promise<void> {
    assert(state, MoneyKeyringSerializedStateStruct);

    if (this.#entropySource !== undefined) {
      throw new Error('MoneyKeyring: cannot deserialize after initialization');
    }

    const mnemonic = await this.#getMnemonic(state.entropySource);
    await this.#inner.deserialize({
      mnemonic,
      numberOfAccounts: state.numberOfAccounts,
      hdPath: MONEY_DERIVATION_PATH,
    });

    this.#entropySource = state.entropySource;
  }

  /**
   * Add the single Money account to this keyring.
   *
   * @param numberOfAccounts - Must be 1 (the only supported value).
   * @returns The address of the newly added account.
   * @throws If `numberOfAccounts` is not 1 or an account already exists.
   */
  async addAccounts(numberOfAccounts = 1): Promise<Hex[]> {
    if (numberOfAccounts !== 1) {
      throw new Error('MoneyKeyring: supports adding exactly one account');
    }

    const existing = await this.#inner.getAccounts();
    if (existing.length > 0) {
      throw new Error('MoneyKeyring: already has an account');
    }

    return this.#inner.addAccounts(1);
  }

  // -----------------------------------------------------------------------------------
  // The methods below are pass-throughs to the inner HdKeyring.

  async getAccounts(
    ...args: Parameters<HdKeyring['getAccounts']>
  ): ReturnType<HdKeyring['getAccounts']> {
    return this.#inner.getAccounts(...args);
  }

  removeAccount(
    ...args: Parameters<HdKeyring['removeAccount']>
  ): ReturnType<HdKeyring['removeAccount']> {
    this.#inner.removeAccount(...args);
  }

  async signTransaction(
    ...args: Parameters<HdKeyring['signTransaction']>
  ): ReturnType<HdKeyring['signTransaction']> {
    return this.#inner.signTransaction(...args);
  }

  async signPersonalMessage(
    ...args: Parameters<HdKeyring['signPersonalMessage']>
  ): ReturnType<HdKeyring['signPersonalMessage']> {
    return this.#inner.signPersonalMessage(...args);
  }

  async signTypedData(
    ...args: Parameters<HdKeyring['signTypedData']>
  ): ReturnType<HdKeyring['signTypedData']> {
    return this.#inner.signTypedData(...args);
  }

  async signEip7702Authorization(
    ...args: Parameters<HdKeyring['signEip7702Authorization']>
  ): ReturnType<HdKeyring['signEip7702Authorization']> {
    return this.#inner.signEip7702Authorization(...args);
  }
}
