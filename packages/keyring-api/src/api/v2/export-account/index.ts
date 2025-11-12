import { type Infer } from '@metamask/superstruct';
import {
  ExportAccountPrivateKeyOptionsStruct,
  PrivateKeyExportedAccountStruct,
} from './private-key';

export * from './private-key';

/**
 * Enum representing the different types of account export methods.
 */
export enum AccountExportType {
  /**
   * Export account as a private key.
   */
  PrivateKey = 'private-key',
}

/**
 * Struct for {@link ExportAccountOptions}.
 */
export const ExportAccountOptionsStruct = ExportAccountPrivateKeyOptionsStruct;

/**
 * Represents the options for exporting an account.
 */
export type ExportAccountOptions = Infer<typeof ExportAccountOptionsStruct>;

/**
 * Struct for {@link ExportedAccount}.
 */
export const ExportedAccountStruct = PrivateKeyExportedAccountStruct;

/**
 * Represents an account that has been exported.
 */
export type ExportedAccount = Infer<typeof ExportedAccountStruct>;
