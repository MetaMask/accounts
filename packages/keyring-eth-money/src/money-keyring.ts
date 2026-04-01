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
 * EVM signer interface, a subset of {@link HdKeyring} methods.
 */
export type EvmSigner = {
  signTransaction: HdKeyring['signTransaction'];
  signPersonalMessage: HdKeyring['signPersonalMessage'];
  signTypedData: HdKeyring['signTypedData'];
  signEip7702Authorization: HdKeyring['signEip7702Authorization'];
};

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
   * Runs a callback with the initialized inner {@link HdKeyring}, always within
   * the mutex lock. Initializes {@link HdKeyring} on the first call.
   *
   * The initialization is deferred until first needed so that the potentially
   * expensive {@link GetMnemonicCallback} is not invoked during
   * {@link MoneyKeyring.deserialize} or {@link MoneyKeyring.getAccounts}.
   *
   * @param callback - Function to execute with the initialized inner keyring.
   * @returns The result of the callback.
   */
  async #withLockedInner<ReturnType>(
    callback: (inner: HdKeyring) => Promise<ReturnType> | ReturnType,
  ): Promise<ReturnType> {
    const entropySource = this.#entropySource;
    if (!entropySource) {
      throw new Error('MoneyKeyring: not yet deserialized');
    }

    return this.#lock.runExclusive(async () => {
      if (!this.#inner) {
        const mnemonic = await this.#getMnemonic(entropySource);
        const inner = new HdKeyring({
          cryptographicFunctions: this.#cryptographicFunctions,
        });
        await inner.deserialize({
          mnemonic,
          numberOfAccounts: this.#account ? 1 : 0,
          hdPath: MONEY_DERIVATION_PATH,
        });

        if (this.#account) {
          const [derivedAccount] = await inner.getAccounts();
          if (derivedAccount?.toLowerCase() !== this.#account.toLowerCase()) {
            throw new Error('MoneyKeyring: signer account mismatch');
          }
        }

        this.#inner = inner;
      }

      return callback(this.#inner);
    });
  }

  /**
   * Returns the initialized inner {@link HdKeyring}.
   *
   * Uses a fast path if already initialized, otherwise delegates to
   * {@link MoneyKeyring.#withLockedInner}.
   *
   * @returns The EVM signer instance.
   */
  async #getSigner(): Promise<EvmSigner> {
    if (this.#inner) {
      return this.#inner;
    }

    // We use the mutex-protected method to initialize the inner keyring if needed, but once
    // initialized, we can return it directly and use it as the signer instance.
    return this.#withLockedInner((inner) => inner);
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

    return this.#withLockedInner(async (inner) => {
      if (this.#account !== undefined) {
        throw new Error('MoneyKeyring: already has an account');
      }

      const [account] = await inner.addAccounts(1);
      if (!account) {
        throw new Error('MoneyKeyring: failed to add account');
      }
      this.#account = account;

      return [account];
    });
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
