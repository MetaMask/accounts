import { selectiveUnion } from '@metamask/keyring-utils';
import { type Infer } from '@metamask/superstruct';

import {
  CreateAccountBip44DiscoverOptionsStruct,
  CreateAccountBip44DeriveIndexOptionsStruct,
  CreateAccountBip44DerivePathOptionsStruct,
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
  Bip44DerivePath = 'bip44:derive-path',

  /**
   * Represents accounts created using a BIP-44 account index.
   *
   * More than one account can be created, for example, the keyring can create
   * multiple account types (e.g., P2PKH, P2TR, P2WPKH) for the same account
   * index.
   */
  Bip44DeriveIndex = 'bip44:derive-index',

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
export const CreateAccountOptionsStruct = selectiveUnion((value: any) => {
  const accountCreationType = value?.type as AccountCreationType;
  switch (accountCreationType) {
    case AccountCreationType.Bip44DerivePath:
      return CreateAccountBip44DerivePathOptionsStruct;
    case AccountCreationType.Bip44DeriveIndex:
      return CreateAccountBip44DeriveIndexOptionsStruct;
    case AccountCreationType.Bip44Discover:
      return CreateAccountBip44DiscoverOptionsStruct;
    case AccountCreationType.PrivateKeyImport:
      return CreateAccountPrivateKeyOptionsStruct;
    default:
      // Return first struct as fallback - validation will fail with proper error indicating the type mismatch
      return CreateAccountBip44DerivePathOptionsStruct;
  }
});

/**
 * Represents the available options for creating a new account.
 */
export type CreateAccountOptions = Infer<typeof CreateAccountOptionsStruct>;
