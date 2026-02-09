import { selectiveUnion } from '@metamask/keyring-utils';
import { type Infer } from '@metamask/superstruct';

import {
  CreateAccountBip44DiscoverOptionsStruct,
  CreateAccountBip44DeriveIndexOptionsStruct,
  CreateAccountBip44DeriveIndexRangeOptionsStruct,
  CreateAccountBip44DerivePathOptionsStruct,
} from './bip44';
import { CreateAccountCustomOptionsStruct } from './custom';
import { CreateAccountPrivateKeyOptionsStruct } from './private-key';

export * from './bip44';
export * from './custom';
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
   * Represents accounts created by deriving a range of BIP-44 account indices.
   *
   * More than one account can be created per index, for example, the keyring
   * can create multiple account types (e.g., P2PKH, P2TR, P2WPKH) for each
   * account index in the range.
   */
  Bip44DeriveIndexRange = 'bip44:derive-index-range',

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

  /**
   * Represents an account created using a custom, keyring-specific method.
   *
   * This is used by keyrings that have non-standard account creation flows
   * and declare `custom.createAccounts: true` in their capabilities.
   */
  Custom = 'custom',
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
    case AccountCreationType.Bip44DeriveIndexRange:
      return CreateAccountBip44DeriveIndexRangeOptionsStruct;
    case AccountCreationType.Bip44Discover:
      return CreateAccountBip44DiscoverOptionsStruct;
    case AccountCreationType.PrivateKeyImport:
      return CreateAccountPrivateKeyOptionsStruct;
    case AccountCreationType.Custom:
      return CreateAccountCustomOptionsStruct;
    default:
      // Return first struct as fallback - validation will fail with proper error indicating the type mismatch
      return CreateAccountBip44DerivePathOptionsStruct;
  }
});

/**
 * Represents the available options for creating a new account.
 */
export type CreateAccountOptions = Infer<typeof CreateAccountOptionsStruct>;

/**
 * Asserts that a given create account option type is supported by the keyring.
 *
 * @example
 * ```ts
 * createAccounts(options: CreateAccountOptions) {
 *   assertCreateAccountOptionIsSupported(options, [
 *     ${AccountCreationType.Bip44DeriveIndex},
 *     ${AccountCreationType.Bip44DeriveIndexRange},
 *   ] as const);
 *
 *   // At this point, TypeScript knows that options.type is either Bip44DeriveIndex or Bip44DeriveIndexRange.
 *   if (options.type === AccountCreationType.Bip44DeriveIndex) {
 *     ... // Handle Bip44DeriveIndex case.
 *   } else {
 *     ... // Handle Bip44DeriveIndexRange case.
 *   }
 *   ...
 *   return accounts;
 * }
 * ```
 *
 * @param options - The create account option object to check.
 * @param supportedTypes - The list of supported create account option types for this keyring.
 * @throws Will throw an error if the provided type is not supported.
 */
export function assertCreateAccountOptionIsSupported<
  Options extends CreateAccountOptions,
  // We use template literal types to enforce string-literal over strict enum values.
  Type extends `${CreateAccountOptions['type']}`,
>(
  options: Options,
  supportedTypes: readonly `${Type}`[],
  // Use intersection to narrow the `type` based on the the static `Options['type']` field.
): asserts options is Options & { type: `${Type}` & `${Options['type']}` } {
  const { type } = options;
  const types: readonly CreateAccountOptions['type'][] = supportedTypes;

  if (!types.includes(type)) {
    throw new Error(`Unsupported create account option type: ${type}`);
  }
}
