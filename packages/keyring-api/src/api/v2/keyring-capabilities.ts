import {
  array,
  boolean,
  optional,
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
 * Struct for {@link KeyringCapabilities}.
 */
export const KeyringCapabilitiesStruct = object({
  /**
   * List of CAIP-2 chain IDs that this keyring supports.
   */
  scopes: nonempty(array(CaipChainIdStruct)),
  /**
   * BIP-44 capabilities supported by this keyring.
   */
  bip44: optional(
    object({
      /**
       * Whether the keyring supports deriving accounts from a specific BIP-44 path.
       */
      derivePath: optional(boolean()),
      /**
       * Whether the keyring supports deriving accounts from a BIP-44 account index.
       */
      deriveIndex: optional(boolean()),
      /**
       * Whether the keyring supports deriving accounts from a range of BIP-44 account indices.
       */
      deriveIndexRange: optional(boolean()),
      /**
       * Whether the keyring supports BIP-44 account discovery.
       */
      discover: optional(boolean()),
    }),
  ),
  /**
   * Private key capabilities supported by this keyring.
   */
  privateKey: optional(
    object({
      /**
       * List of supported formats for importing private keys.
       */
      importFormats: optional(array(ImportPrivateKeyFormatStruct)),
      /**
       * List of supported formats for exporting private keys.
       */
      exportFormats: optional(array(ExportPrivateKeyFormatStruct)),
    }),
  ),
  /**
   * Indicates which KeyringV2 methods accept non-standard options.
   *
   * When a method is set to `true`, it signals that the keyring implementation
   * accepts custom options for that method, different from the standard API.
   * This is a workaround for keyrings with very specific requirements.
   */
  custom: optional(
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
 *   scopes: ['bip122:_'],
 *   bip44: {
 *     derivePath: true,
 *     deriveIndex: true,
 *     deriveIndexRange: true,
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
