import {
  array,
  boolean,
  enums,
  exactOptional,
  nonempty,
  object,
  partial,
  type Infer,
} from '@metamask/superstruct';

import {
  ExportPrivateKeyFormatStruct,
  ImportPrivateKeyFormatStruct,
} from './private-key';
import { CaipChainIdStruct } from '../caip';

/**
 * Enum representing keyring API versions.
 */
export enum KeyringVersion {
  /**
   * Initial Keyring API.
   */
  V1 = 1,

  /**
   * Unified keyring API introducing the new capabilities system.
   *
   * Requires Snap platform: TBD (TODO)
   */
  V2 = 2,
}

/**
 * Struct for {@link KeyringCapabilities}.
 */
export const KeyringCapabilitiesStruct = object({
  /**
   * List of keyring API versions that this keyring supports.
   */
  versions: nonempty(array(enums([KeyringVersion.V1, KeyringVersion.V2]))),
  /**
   * List of CAIP-2 chain IDs that this keyring supports.
   */
  scopes: nonempty(array(CaipChainIdStruct)),
  /**
   * BIP-44 capabilities supported by this keyring.
   */
  bip44: exactOptional(
    object({
      /**
       * Whether the keyring supports deriving accounts from a specific BIP-44 path.
       */
      derivePath: boolean(),
      /**
       * Whether the keyring supports deriving accounts from a BIP-44 account index.
       */
      deriveIndex: boolean(),
      /**
       * Whether the keyring supports BIP-44 account discovery.
       */
      discover: boolean(),
    }),
  ),
  /**
   * Private key capabilities supported by this keyring.
   */
  privateKey: exactOptional(
    object({
      /**
       * List of supported formats for importing private keys.
       */
      importFormats: exactOptional(array(ImportPrivateKeyFormatStruct)),
      /**
       * List of supported formats for exporting private keys.
       */
      exportFormats: exactOptional(array(ExportPrivateKeyFormatStruct)),
    }),
  ),
  /**
   * Indicates which KeyringV2 methods accept non-standard options.
   *
   * When a method is set to `true`, it signals that the keyring implementation
   * accepts custom options for that method, different from the standard API.
   * This is a workaround for keyrings with very specific requirements.
   */
  custom: exactOptional(
    partial(
      object({
        createAccounts: boolean(),
      }),
    ),
  ),
});

/**
 * Type representing the capabilities supported by a keyring.
 *
 * @example
 * ```ts
 * const capabilities: KeyringCapabilities = {
 *   versions: [KeyringVersion.V2],
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
export type KeyringCapabilities = Infer<typeof KeyringCapabilitiesStruct>;
