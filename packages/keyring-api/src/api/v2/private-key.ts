import {
  enums,
  exactOptional,
  object,
  type Infer,
} from '@metamask/superstruct';

import { KeyringAccountTypeStruct } from '../account';

/**
 * Supported encoding formats for private keys.
 */
export enum PrivateKeyEncoding {
  /**
   * Hexadecimal encoding format.
   */
  Hexadecimal = 'hexadecimal',

  /**
   * Base58 encoding format.
   */
  Base58 = 'base58',
}

/**
 * Struct for {@link PrivateKeyEncoding}.
 */
export const PrivateKeyEncodingStruct = enums([
  `${PrivateKeyEncoding.Hexadecimal}`,
  `${PrivateKeyEncoding.Base58}`,
]);

/**
 * Struct for {@link ImportPrivateKeyFormat}.
 */
export const ImportPrivateKeyFormatStruct = object({
  /**
   * Format used to encode the private key as a string.
   */
  encoding: PrivateKeyEncodingStruct,

  /**
   * Type of the account to be created.
   *
   * This field is necessary when there is ambiguity about the type of account
   * to be created from the private key. For example, in Bitcoin, a private key
   * can be used to create multiple types of accounts, such as P2WPKH, or P2TR.
   */
  type: exactOptional(KeyringAccountTypeStruct),
});

/**
 * Represents the format for importing a private key into a keyring.
 */
export type ImportPrivateKeyFormat = Infer<typeof ImportPrivateKeyFormatStruct>;

/**
 * Struct for {@link ExportPrivateKeyFormat}.
 */
export const ExportPrivateKeyFormatStruct = object({
  /**
   * Format used to encode the private key as a string.
   */
  encoding: PrivateKeyEncodingStruct,
});

/**
 * Represents the format for exporting a private key from a keyring.
 */
export type ExportPrivateKeyFormat = Infer<typeof ExportPrivateKeyFormatStruct>;
