import {
  enums,
  exactOptional,
  literal,
  object,
  string,
  type Infer,
} from '@metamask/superstruct';

import {
  AnyAccountType,
  BtcAccountType,
  EthAccountType,
  SolAccountType,
  TrxAccountType,
} from '../../account';
import { PrivateKeyEncodings } from '../private-key';

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
  encoding: enums(PrivateKeyEncodings),
  /**
   * The account type of the imported account.
   */
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
 * Options for importing an account from a private key.
 */
export type CreateAccountPrivateKeyOptions = Infer<
  typeof CreateAccountPrivateKeyOptionsStruct
>;
