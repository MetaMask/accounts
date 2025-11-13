import {
  exactOptional,
  literal,
  object,
  string,
  type Infer,
} from '@metamask/superstruct';

import { KeyringAccountTypeStruct } from '../../account';
import { PrivateKeyEncodingStruct } from '../private-key';

/**
 * Struct for {@link CreateAccountPrivateKeyOptions}.
 */
export const CreateAccountPrivateKeyOptionsStruct = object({
  /**
   * The type of the options.
   */
  type: literal('private-key:import'),
  /**
   * The encoded private key to be imported.
   */
  privateKey: string(),
  /**
   * The encoding of the private key.
   */
  encoding: PrivateKeyEncodingStruct,
  /**
   * The account type of the imported account.
   */
  accountType: exactOptional(KeyringAccountTypeStruct),
});

/**
 * Options for importing an account from a private key.
 */
export type CreateAccountPrivateKeyOptions = Infer<
  typeof CreateAccountPrivateKeyOptionsStruct
>;
