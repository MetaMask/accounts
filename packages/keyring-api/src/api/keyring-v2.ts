import type { AccountId } from '@metamask/keyring-utils';
import type { Json } from '@metamask/utils';

import type { KeyringAccount, KeyringAccountType } from './account';
import {
  AnyAccountType,
  BtcAccountType,
  EthAccountType,
  SolAccountType,
  TrxAccountType,
} from './account';
import type { CaipChainId } from './caip';
import type { KeyringRequest } from './request';
import { CaipChainIdStruct } from './caip';
import { DerivationPathStruct } from './derivation';
import type { EntropySourceId } from './entropy';
import {
  array,
  boolean,
  enums,
  exactOptional,
  literal,
  nonempty,
  number,
  object,
  union,
  string,
} from '@metamask/superstruct';

/**
 * Represents the format for importing a private key into a keyring.
 */
export type ImportPrivateKeyFormat = {
  /**
   * Format used to encode the private key as a string.
   */
  encoding: 'hexadecimal' | 'base58';

  /**
   * Type of the account to be created.
   *
   * This field is necessary when there is ambiguity about the type of account
   * to be created from the private key. For example, in Bitcoin, a private key
   * can be used to create multiple types of accounts, such as P2WPKH, or P2TR.
   */
  type?: KeyringAccountType;
};

/**
 * Runtime validator for {@link ImportPrivateKeyFormat}.
 */
export const ImportPrivateKeyFormatStruct = object({
  encoding: enums(['hexadecimal', 'base58'] as const),
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
 * Represents the format for exporting a private key from a keyring.
 */
export type ExportPrivateKeyFormat = Omit<ImportPrivateKeyFormat, 'type'>;

/**
 * Runtime validator for {@link ExportPrivateKeyFormat}.
 */
export const ExportPrivateKeyFormatStruct = object({
  encoding: enums(['hexadecimal', 'base58'] as const),
});

/**
 * Type representing the capabilities supported by a keyring.
 *
 * @example
 * ```ts
 * const capabilities: KeyringCapabilities = {
 *   scopes: ['bip122:_'],
 *   bip44: {
 *     derivePath: true,
 *     deriveIndex: true,
 *     discover: true,
 *   },
 *   privateKey: {
 *     importFormats: [
 *       { encoding: 'base58', type: 'bip122:p2sh' },
 *       { encoding: 'base58', type: 'bip122:p2tr' },
 *       { encoding: 'base58', type: 'bip122:p2pkh' },
 *       { encoding: 'base58', type: 'bip122:p2wpkh' },
 *     ],
 *     exportFormats: [
 *       { encoding: 'base58' },
 *       { encoding: 'base58' },
 *     ],
 *   },
 * };
 * ```
 */
export type KeyringCapabilities = {
  /**
   * List of CAIP-2 chain IDs that this keyring supports.
   */
  scopes: CaipChainId[];

  /**
   * BIP-44 capabilities supported by this keyring.
   */
  bip44?: {
    /**
     * Whether the keyring supports deriving accounts from a specific BIP-44 path.
     */
    derivePath: boolean;

    /**
     * Whether the keyring supports deriving accounts from a BIP-44 account index.
     */
    deriveIndex: boolean;

    /**
     * Whether the keyring supports BIP-44 account discovery.
     */
    discover: boolean;
  };

  /**
   * Private key capabilities supported by this keyring.
   */
  privateKey?: {
    /**
     * List of supported formats for importing private keys.
     */
    importFormats: ImportPrivateKeyFormat[];

    /**
     * List of supported formats for exporting private keys.
     */
    exportFormats: ExportPrivateKeyFormat[];
  };
};

/**
 * Runtime validator for {@link KeyringCapabilities}.
 */
export const KeyringCapabilitiesStruct = object({
  scopes: nonempty(array(CaipChainIdStruct)),
  bip44: exactOptional(
    object({
      derivePath: boolean(),
      deriveIndex: boolean(),
      discover: boolean(),
    }),
  ),
  privateKey: exactOptional(
    object({
      importFormats: array(ImportPrivateKeyFormatStruct),
      exportFormats: array(ExportPrivateKeyFormatStruct),
    }),
  ),
});

/**
 * Enum representing the different types of keyrings supported.
 */
export enum KeyringType {
  /**
   * Represents a hierarchical deterministic (HD) keyring.
   */
  Hd = 'hd',

  /**
   * Represents a keyring that directly stores private keys.
   */
  PrivateKey = 'private-key',

  /**
   * Represents a keyring that implements the QR protocol.
   *
   * See: https://eips.ethereum.org/EIPS/eip-4527
   */
  Qr = 'qr',

  /**
   * Represents keyring backed by a Snap.
   */
  Snap = 'snap',

  /**
   * Represents keyring backed by a Ledger hardware wallet.
   */
  Ledger = 'ledger',

  /**
   * Represents keyring backed by a Lattice hardware wallet.
   */
  Lattice = 'lattice',

  /**
   * Represents keyring backed by a Trezor hardware wallet.
   */
  Trezor = 'trezor',
}

/**
 * Enum representing the different ways an account can be created.
 */
export enum AccountCreationType {
  /**
   * Represents an account created using a BIP-44 derivation path.
   */
  Bip44Path = 'bip44:derive-path',

  /**
   * Represents accounts created using a BIP-44 account index.
   *
   * More than one account can be created, for example, the keyring can create
   * multiple account types (e.g., P2PKH, P2TR, P2WPKH) for the same account
   * index.
   */
  Bip44Index = 'bip44:derive-index',

  /**
   * Represents accounts created through BIP-44 account discovery.
   *
   * More than one account can be created, for example, the keyring can create
   * multiple account types (e.g., P2PKH, P2TR, P2WPKH) for the same account
   * index.
   */
  Bip44Discover = 'bip44:discover',

  /**
   * Represents an account imported from a private key.
   */
  PrivateKeyImport = 'private-key:import',
}

/**
 * Options for creating an account using the given BIP-44 derivation path.
 */
export type CreateAccountBip44PathOptions = {
  /**
   * Type of the options.
   */
  type: AccountCreationType.Bip44Path;

  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: EntropySourceId;

  /**
   * BIP-44 derivation path to be used to derive the account.
   */
  derivationPath: string;
};

/**
 * Runtime validator for {@link CreateAccountBip44PathOptions}.
 */
export const CreateAccountBip44PathOptionsStruct = object({
  type: literal('bip44:derive-path'),
  entropySource: string(),
  derivationPath: DerivationPathStruct,
});

/**
 * Options for creating an account using the given BIP-44 account group index.
 *
 * Note that the keyring can support non-standard BIP-44 paths for
 * compatibility with other wallets.
 */
export type CreateAccountBip44IndexOptions = {
  /**
   * The type of the options.
   */
  type: AccountCreationType.Bip44Index;

  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: EntropySourceId;

  /**
   * The index of the account group to be derived.
   */
  groupIndex: number;
};

/**
 * Runtime validator for {@link CreateAccountBip44IndexOptions}.
 */
export const CreateAccountBip44IndexOptionsStruct = object({
  type: literal('bip44:derive-index'),
  entropySource: string(),
  groupIndex: number(),
});

/**
 * Options for creating accounts by performing a BIP-44 account discovery.
 *
 * Note that the keyring can support non-standard BIP-44 paths for
 * compatibility with other wallets.
 */
export type CreateAccountBip44DiscoverOptions = {
  /**
   * The type of the options.
   */
  type: AccountCreationType.Bip44Discover;

  /**
   * ID of the entropy source to be used to derive the account.
   */
  entropySource: EntropySourceId;

  /**
   * The index of the account group to be derived.
   */
  groupIndex: number;
};

/**
 * Runtime validator for {@link CreateAccountBip44DiscoverOptions}.
 */
export const CreateAccountBip44DiscoverOptionsStruct = object({
  type: literal('bip44:discover'),
  entropySource: string(),
  groupIndex: number(),
});

/**
 * Options for importing an account from a private key.
 */
export type CreateAccountPrivateKeyOptions = {
  /**
   * The type of the options.
   */
  type: AccountCreationType.PrivateKeyImport;

  /**
   * The encoded private key to be imported.
   */
  privateKey: string;

  /**
   * The encoding of the private key.
   */
  encoding: ImportPrivateKeyFormat['encoding'];

  /**
   * The account type of the imported account.
   */
  accountType?: KeyringAccountType;
};

/**
 * Runtime validator for {@link CreateAccountPrivateKeyOptions}.
 */
export const CreateAccountPrivateKeyOptionsStruct = object({
  type: literal('private-key:import'),
  privateKey: string(),
  encoding: enums(['hexadecimal', 'base58'] as const),
  accountType: exactOptional(
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
 * Represents the available options for creating a new account.
 */
export type CreateAccountOptions =
  | CreateAccountBip44PathOptions
  | CreateAccountBip44IndexOptions
  | CreateAccountBip44DiscoverOptions
  | CreateAccountPrivateKeyOptions;

/**
 * Runtime validator for {@link CreateAccountOptions}.
 */
export const CreateAccountOptionsStruct = union([
  CreateAccountBip44PathOptionsStruct,
  CreateAccountBip44IndexOptionsStruct,
  CreateAccountBip44DiscoverOptionsStruct,
  CreateAccountPrivateKeyOptionsStruct,
]);

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
 * Represents an account that has been exported using a private key.
 */
export type PrivateKeyExportedAccount = {
  /**
   * The type of the account export.
   */
  type: AccountExportType.PrivateKey;

  /**
   * The private key of the exported account.
   */
  privateKey: string;

  /**
   * The encoding of the exported private key.
   */
  encoding: ExportPrivateKeyFormat['encoding'];
};

/**
 * Runtime validator for {@link PrivateKeyExportedAccount}.
 */
export const PrivateKeyExportedAccountStruct = object({
  type: literal('private-key'),
  privateKey: string(),
  encoding: enums(['hexadecimal', 'base58'] as const),
});

/**
 * Options for exporting an account's private key.
 */
export type ExportAccountPrivateKeyOptions = {
  /**
   * The type of the account export.
   */
  type: AccountExportType.PrivateKey;

  /**
   * The encoding of the exported private key.
   */
  encoding: ExportPrivateKeyFormat['encoding'];
};

/**
 * Runtime validator for {@link ExportAccountPrivateKeyOptions}.
 */
export const ExportAccountPrivateKeyOptionsStruct = object({
  type: literal('private-key'),
  encoding: enums(['hexadecimal', 'base58'] as const),
});

/**
 * Represents the options for exporting an account.
 */
export type ExportAccountOptions = ExportAccountPrivateKeyOptions;

/**
 * Runtime validator for {@link ExportAccountOptions}.
 */
export const ExportAccountOptionsStruct = ExportAccountPrivateKeyOptionsStruct;

/**
 * Represents an account that has been exported.
 */
export type ExportedAccount = PrivateKeyExportedAccount;

/**
 * Runtime validator for {@link ExportedAccount}.
 */
export const ExportedAccountStruct = PrivateKeyExportedAccountStruct;

/**
 * The KeyringV2 interface defines methods for managing accounts and signing
 * requests. This interface unifies the existing EVM and Snap keyring interfaces
 * to provide a consistent API for all keyring types.
 *
 * This interface supports both EVM and non-EVM chains, and includes
 * account metadata needed for features like Multi-SRP and Backup and Sync.
 */
export type KeyringV2 = {
  /**
   * Type of the keyring.
   */
  type: KeyringType;

  /**
   * List of capabilities supported by the keyring.
   */
  capabilities: KeyringCapabilities;

  /**
   * Serialize the keyring state to a JSON object.
   *
   * @returns A promise that resolves to a JSON-serializable representation of
   * the keyring state.
   */
  serialize(): Promise<Json>;

  /**
   * Restores the keyring state from a serialized JSON object.
   *
   * @param state - A JSON object representing a serialized keyring state.
   * @returns A promise that resolves when the keyring state has been restored.
   */
  deserialize(state: Json): Promise<void>;

  /**
   * Initialize the keyring.
   *
   * This method is called after the constructor to allow the keyring to
   * perform any necessary asynchronous initialization tasks.
   *
   * @returns A promise that resolves when initialization is complete.
   */
  init?(): Promise<void>;

  /**
   * Destroy the keyring.
   *
   * This method is called before the keyring is removed from the Keyring
   * Controller, allowing the keyring to perform any necessary cleanup tasks.
   *
   * @returns A promise that resolves when cleanup is complete.
   */
  destroy?(): Promise<void>;

  /**
   * Returns all accounts managed by the keyring.
   *
   * @returns A promise that resolves to an array of all accounts managed by
   * this keyring.
   */
  getAccounts(): Promise<KeyringAccount[]>;

  /**
   * Returns the account with the specified ID.
   *
   * @param accountId - ID of the account to retrieve.
   * @returns A promise that resolves to the account with the given ID.
   */
  getAccount(accountId: AccountId): Promise<KeyringAccount>;

  /**
   * Creates one or more new accounts according to the provided options.
   *
   * Deterministic account creation MUST be idempotent, meaning that for
   * deterministic algorithms, like BIP-44, calling this method with the same
   * options should always return the same accounts, even if the accounts
   * already exist in the keyring.
   *
   * @param options - Options describing how to create the account(s).
   * @returns A promise that resolves to an array of the created account objects.
   */
  createAccounts(options: CreateAccountOptions): Promise<KeyringAccount[]>;

  /**
   * Deletes the account with the specified ID.
   *
   * @param accountId - ID of the account to delete.
   * @returns A promise that resolves when the account has been deleted.
   */
  deleteAccount(accountId: AccountId): Promise<void>;

  /**
   * Exports the private key or secret material for the specified account.
   *
   * @param accountId - ID of the account to export.
   * @param options - Optional export options.
   * @returns A promise that resolves to the exported account data.
   */
  exportAccount?(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount>;

  /**
   * Submits a request to the keyring.
   *
   * @param request - The `KeyringRequest` object to submit.
   * @returns A promise that resolves to the response for the request.
   */
  submitRequest(request: KeyringRequest): Promise<Json>;
};
