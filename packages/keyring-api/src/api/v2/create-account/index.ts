import { union, type Infer } from '@metamask/superstruct';

import {
  CreateAccountBip44DiscoverOptionsStruct,
  CreateAccountBip44IndexOptionsStruct,
  CreateAccountBip44PathOptionsStruct,
} from './bip44';
import { CreateAccountPrivateKeyOptionsStruct } from './private-key';

export * from './bip44';
export * from './private-key';

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
 * Struct for {@link CreateAccountOptions}.
 */
export const CreateAccountOptionsStruct = union([
  CreateAccountBip44PathOptionsStruct,
  CreateAccountBip44IndexOptionsStruct,
  CreateAccountBip44DiscoverOptionsStruct,
  CreateAccountPrivateKeyOptionsStruct,
]);

/**
 * Represents the available options for creating a new account.
 */
export type CreateAccountOptions = Infer<typeof CreateAccountOptionsStruct>;
