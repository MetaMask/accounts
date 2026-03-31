import { HdKeyring } from '@metamask/eth-hd-keyring';
import { type CryptographicFunctions } from '@metamask/key-tree';
import { EthAddressStrictStruct } from '@metamask/keyring-api';
import type { Keyring } from '@metamask/keyring-utils';
import {
  assert,
  type Infer,
  object,
  optional,
  string as stringStruct,
} from '@metamask/superstruct';
import { type Hex } from '@metamask/utils';
import { Mutex } from 'async-mutex';

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
  cryptographicFunctions?: CryptographicFunctions;
};

/**
 * Struct for validating the serialized state of a {@link MoneyKeyring}.
 *
 * @property entropySource - The entropy source identifier.
 * @property account - The account address, if one has been added.
 */
const MoneyKeyringSerializedStateStruct = object({
  entropySource: stringStruct(),
  account: optional(EthAddressStrictStruct),
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
 *
 * The inner {@link HdKeyring} is instantiated lazily on the first signing operation
 * (via {@link MoneyKeyring.#getSigner}). A mutex ensures that concurrent callers never
 * trigger more than one initialization.
 */
export class MoneyKeyring implements Keyring {
  static type: string = MONEY_KEYRING_TYPE;

  readonly type: string = MONEY_KEYRING_TYPE;

  readonly #getMnemonic: GetMnemonicCallback;

  readonly #cryptographicFunctions: CryptographicFunctions | undefined;

  #entropySource: string | undefined;

  #account: Hex | undefined;

  #inner: HdKeyring | undefined;

  readonly #lock = new Mutex();

  constructor({ getMnemonic, cryptographicFunctions }: MoneyKeyringOptions) {
    this.#getMnemonic = getMnemonic;
    this.#cryptographicFunctions = cryptographicFunctions;
  }

  get entropySource(): string | undefined {
    return this.#entropySource;
  }

  async serialize(): Promise<MoneyKeyringSerializedState> {
    const state = {
      entropySource: this.#entropySource,
      account: this.#account,
    };
    assert(state, MoneyKeyringSerializedStateStruct);

    return state;
  }

  async deserialize(state: MoneyKeyringSerializedState): Promise<void> {
    assert(state, MoneyKeyringSerializedStateStruct);

    if (this.#entropySource !== undefined) {
      throw new Error('MoneyKeyring: cannot deserialize after initialization');
    }

    this.#entropySource = state.entropySource;
    this.#account = state.account;
  }

  /**
   * Returns the inner {@link HdKeyring}, initializing it on first call.
   *
   * The initialization is deferred until a signing operation is first needed so
   * that the potentially expensive {@link GetMnemonicCallback} is not invoked
   * during {@link MoneyKeyring.deserialize} or {@link MoneyKeyring.getAccounts}.
   * A mutex guarantees that concurrent callers trigger exactly one initialization.
   *
   * Also, we might not be able to have access to the memonic at the time of
   * deserialization, so we need to defer it until it's actually needed.
   *
   * @returns The inner {@link HdKeyring} (signer) instance.
   */
  async #getSigner(): Promise<HdKeyring> {
    const entropySource = this.#entropySource;
    if (!entropySource) {
      // Without an entropy source, we cannot initialize the inner keyring.
      throw new Error('MoneyKeyring: not yet deserialized');
    }

    if (this.#inner) {
      return this.#inner;
    }

    return this.#lock.runExclusive(async () => {
      // Check if another caller initialized the inner keyring while we
      // were waiting for the lock.
      if (this.#inner) {
        return this.#inner;
      }

      const mnemonic = await this.#getMnemonic(entropySource);
      const inner = new HdKeyring({
        cryptographicFunctions: this.#cryptographicFunctions,
      });
      await inner.deserialize({
        mnemonic,
        numberOfAccounts: this.#account ? 1 : 0,
        hdPath: MONEY_DERIVATION_PATH,
      });
      this.#inner = inner;

      return inner;
    });
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

    if (this.#account !== undefined) {
      throw new Error('MoneyKeyring: already has an account');
    }

    const signer = await this.#getSigner();
    const [account] = await signer.addAccounts(1);
    if (!account) {
      throw new Error('MoneyKeyring: failed to add account');
    }
    this.#account = account;

    return [account];
  }

  // -----------------------------------------------------------------------------------
  // The methods below are pass-throughs to the inner HdKeyring.

  async getAccounts(): Promise<Hex[]> {
    return this.#account ? [this.#account] : [];
  }

  async signTransaction(
    ...args: Parameters<HdKeyring['signTransaction']>
  ): ReturnType<HdKeyring['signTransaction']> {
    return (await this.#getSigner()).signTransaction(...args);
  }

  async signPersonalMessage(
    ...args: Parameters<HdKeyring['signPersonalMessage']>
  ): ReturnType<HdKeyring['signPersonalMessage']> {
    return (await this.#getSigner()).signPersonalMessage(...args);
  }

  async signTypedData(
    ...args: Parameters<HdKeyring['signTypedData']>
  ): ReturnType<HdKeyring['signTypedData']> {
    return (await this.#getSigner()).signTypedData(...args);
  }

  async signEip7702Authorization(
    ...args: Parameters<HdKeyring['signEip7702Authorization']>
  ): ReturnType<HdKeyring['signEip7702Authorization']> {
    return (await this.#getSigner()).signEip7702Authorization(...args);
  }
}
