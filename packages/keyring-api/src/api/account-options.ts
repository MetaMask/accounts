import { selectiveUnion } from '@metamask/keyring-utils';
import type { Infer } from '@metamask/superstruct';
import {
  boolean,
  intersection,
  literal,
  number,
  object,
  optional,
  record,
  string,
  type,
} from '@metamask/superstruct';
import { isPlainObject, JsonStruct } from '@metamask/utils';

/**
 * Keyring account entropy valid types.
 */
export enum KeyringAccountEntropyTypeOption {
  /**
   * Indicates that the account was created from a mnemonic phrase.
   */
  Mnemonic = 'mnemonic',

  /**
   * Indicates that the account was imported from a private key.
   */
  PrivateKey = 'private-key',
}

/**
 * Keyring account options struct for mnemonics (BIP-44).
 */
export const KeyringAccountEntropyMnemonicOptionsStruct = object({
  /**
   * Indicates that the account was created from a mnemonic phrase.
   */
  type: literal(`${KeyringAccountEntropyTypeOption.Mnemonic}`),

  /**
   * The ID of the entropy source.
   */
  id: string(), // TODO: Define a struct for entropy source.

  /**
   * The BIP-44 derivation path used to derive the account.
   */
  derivationPath: string(),

  /**
   * Index used to group accounts in the UI.
   *
   * Accounts sharing the same `groupIndex` are displayed together as a
   * multichain account group.
   */
  groupIndex: number(),
});

/**
 * Keyring account options for mnemonics (BIP-44) {@link KeyringAccountEntropyMnemonicOptionsStruct}.
 */
export type KeyringAccountEntropyMnemonicOptions = Infer<
  typeof KeyringAccountEntropyMnemonicOptionsStruct
>;

/**
 * Keyring account options struct for private keys.
 */
export const KeyringAccountEntropyPrivateKeyOptionsStruct = object({
  /**
   * Indicates that the account was imported from a private key.
   */
  type: literal(`${KeyringAccountEntropyTypeOption.PrivateKey}`),
});

/**
 * Keyring account options for private keys {@link KeyringAccountEntropyPrivateKeyOptionsStruct}.
 */
export type KeyringAccountEntropyPrivateKeyOptions = Infer<
  typeof KeyringAccountEntropyPrivateKeyOptionsStruct
>;

/**
 * Keyring account entropy options struct.
 */
export const KeyringAccountEntropyOptionsStruct = selectiveUnion(
  (value: any) => {
    const hasType = isPlainObject(value) && typeof value.type === 'string';

    if (hasType && value.type === KeyringAccountEntropyTypeOption.Mnemonic) {
      return KeyringAccountEntropyMnemonicOptionsStruct;
    }

    if (hasType && value.type === KeyringAccountEntropyTypeOption.PrivateKey) {
      return KeyringAccountEntropyPrivateKeyOptionsStruct;
    }

    // Fallback to a "generic value" if we fail to identify the type.
    return JsonStruct;
  },
);

/**
 * Keyring account entropy options {@link KeyringAccountEntropyOptionsStruct}.
 */
export type KeyringAccountEntropyOptions = Infer<
  typeof KeyringAccountEntropyOptionsStruct
>;

/**
 * Keyring options struct. This represents various options for a Keyring account object.
 *
 * See {@link KeyringAccountEntropyMnemonicOptionsStruct} and
 * {@link KeyringAccountEntropyPrivateKeyOptionsStruct}.
 *
 * @example
 * ```ts
 * {
 *   entropy: {
 *     type: 'mnemonic',
 *     id: '01K0BX6VDR5DPDPGGNA8PZVBVB',
 *     derivationPath: "m/44'/60'/0'/0/0",
 *     groupIndex: 0,
 *   },
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   entropy: {
 *     type: 'private-key',
 *   },
 *   exportable: true,
 * }
 * ```
 *
 * @example
 * ```ts
 * {
 *   some: {
 *     untyped: 'options',
 *     something: true,
 *   },
 * }
 * ```
 */
export const KeyringAccountOptionsStruct = intersection([
  // Non-Typed options (retro-compatibility):
  record(string(), JsonStruct),

  // Typed options. We use `type` instead of `object` here, to allow
  // extra properties. Also, since we use `record` + `intersection` we
  // are guaranteed that all field values will match the `JsonStruct`.
  //
  // READ THIS CAREFULLY:
  // Previous options that can be matched by this struct will be breaking
  // existing keyring account options.
  //
  // NOTE: Looks like we cannot use `exactOptional` with `type`, so we just
  // use `optional` instead.
  type({
    /**
     * Entropy options.
     */
    entropy: optional(KeyringAccountEntropyOptionsStruct),

    /**
     * Indicates whether the account can be exported.
     */
    exportable: optional(boolean()),
  }),
]);

/**
 * Keyring account options {@link KeyringAccountOptionsStruct}.
 */
export type KeyringAccountOptions = Infer<typeof KeyringAccountOptionsStruct>;
