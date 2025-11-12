import {
  enums,
  exactOptional,
  object,
  type Infer,
} from '@metamask/superstruct';

import {
  AnyAccountType,
  BtcAccountType,
  EthAccountType,
  SolAccountType,
  TrxAccountType,
} from '../account';

/**
 * Supported encoding formats for private keys.
 */
export const PrivateKeyEncodings = ['hexadecimal', 'base58'] as const;

/**
 * Struct for {@link ImportPrivateKeyFormat}.
 */
export const ImportPrivateKeyFormatStruct = object({
  /**
   * Format used to encode the private key as a string.
   */
  encoding: enums(PrivateKeyEncodings),
  /**
   * Type of the account to be created.
   *
   * This field is necessary when there is ambiguity about the type of account
   * to be created from the private key. For example, in Bitcoin, a private key
   * can be used to create multiple types of accounts, such as P2WPKH, or P2TR.
   */
  type: exactOptional(
    enums([
      `${EthAccountType.Eoa}`,
      `${EthAccountType.Erc4337}`,
      `${BtcAccountType.P2pkh}`,
      `${BtcAccountType.P2sh}`,
      `${BtcAccountType.P2wpkh}`,
      `${BtcAccountType.P2tr}`,
      `${SolAccountType.DataAccount}`,
      `${TrxAccountType.Eoa}`,
      `${AnyAccountType.Account}`,
    ] as const),
  ),
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
  encoding: enums(PrivateKeyEncodings),
});

/**
 * Represents the format for exporting a private key from a keyring.
 */
export type ExportPrivateKeyFormat = Infer<typeof ExportPrivateKeyFormatStruct>;
