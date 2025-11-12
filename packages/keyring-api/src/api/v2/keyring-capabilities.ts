import {
  array,
  boolean,
  exactOptional,
  nonempty,
  object,
  type Infer,
} from '@metamask/superstruct';

import { CaipChainIdStruct } from '../caip';
import {
  ExportPrivateKeyFormatStruct,
  ImportPrivateKeyFormatStruct,
} from './private-key';

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
      importFormats: array(ImportPrivateKeyFormatStruct),
      /**
       * List of supported formats for exporting private keys.
       */
      exportFormats: array(ExportPrivateKeyFormatStruct),
    }),
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
