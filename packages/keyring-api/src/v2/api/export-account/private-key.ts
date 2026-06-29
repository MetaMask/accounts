import { object, sensitive } from '@metamask/keyring-utils';
import { literal, string } from '@metamask/superstruct';
import type { Infer } from '@metamask/superstruct';

import { PrivateKeyEncodingStruct } from '../private-key';

/**
 * Struct for {@link PrivateKeyExportedAccount}.
 */
export const PrivateKeyExportedAccountStruct = object({
  /**
   * The type of the account export.
   */
  type: literal('private-key'),
  /**
   * The private key of the exported account.
   */
  privateKey: sensitive(string()),
  /**
   * The encoding of the exported private key.
   */
  encoding: PrivateKeyEncodingStruct,
});

/**
 * Represents an account that has been exported using a private key.
 */
export type PrivateKeyExportedAccount = Infer<
  typeof PrivateKeyExportedAccountStruct
>;

/**
 * Struct for {@link ExportAccountPrivateKeyOptions}.
 */
export const ExportAccountPrivateKeyOptionsStruct = object({
  /**
   * The type of the account export.
   */
  type: literal('private-key'),
  /**
   * The encoding of the exported private key.
   */
  encoding: PrivateKeyEncodingStruct,
});

/**
 * Options for exporting an account's private key.
 */
export type ExportAccountPrivateKeyOptions = Infer<
  typeof ExportAccountPrivateKeyOptionsStruct
>;
