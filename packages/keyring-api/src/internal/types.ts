import type { Infer, Struct } from '@metamask/superstruct';
import { boolean, string, number } from '@metamask/superstruct';

import {
  BtcAccountType,
  EthAccountType,
  KeyringAccountStruct,
  SolAccountType,
} from '../api';
import { BtcP2wpkhAccountStruct } from '../btc/types';
import { EthEoaAccountStruct, EthErc4337AccountStruct } from '../eth/types';
import { SolEoaAccountStruct } from '../sol/types';
import { exactOptional, object } from '../superstruct';

export type InternalAccountType =
  | EthAccountType
  | BtcAccountType
  | SolAccountType;

export const InternalAccountMetadataStruct = object({
  metadata: object({
    name: string(),
    nameLastUpdatedAt: exactOptional(number()),
    snap: exactOptional(
      object({
        id: string(),
        enabled: boolean(),
        name: string(),
      }),
    ),
    lastSelected: exactOptional(number()),
    importTime: number(),
    keyring: object({
      type: string(),
    }),
  }),
});

export const InternalEthEoaAccountStruct = object({
  ...EthEoaAccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

export const InternalEthErc4337AccountStruct = object({
  ...EthErc4337AccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

export const InternalBtcP2wpkhAccountStruct = object({
  ...BtcP2wpkhAccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

export const InternalSolEoaAccountStruct = object({
  ...SolEoaAccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

export type InternalEthEoaAccount = Infer<typeof InternalEthEoaAccountStruct>;

export type InternalEthErc4337Account = Infer<
  typeof InternalEthErc4337AccountStruct
>;

export type InternalBtcP2wpkhAccount = Infer<
  typeof InternalBtcP2wpkhAccountStruct
>;

export type InternalSolEoaAccount = Infer<typeof InternalSolEoaAccountStruct>;

export const InternalAccountStructs: Record<
  string,
  | Struct<InternalEthEoaAccount>
  | Struct<InternalEthErc4337Account>
  | Struct<InternalBtcP2wpkhAccount>
  | Struct<InternalSolEoaAccount>
> = {
  [`${EthAccountType.Eoa}`]: InternalEthEoaAccountStruct,
  [`${EthAccountType.Erc4337}`]: InternalEthErc4337AccountStruct,
  [`${BtcAccountType.P2wpkh}`]: InternalBtcP2wpkhAccountStruct,
  [`${SolAccountType.Eoa}`]: InternalSolEoaAccountStruct,
};

export type InternalAccountTypes =
  | InternalEthEoaAccount
  | InternalEthErc4337Account
  | InternalBtcP2wpkhAccount
  | InternalSolEoaAccount;

export const InternalAccountStruct = object({
  ...KeyringAccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

/**
 * Internal account representation.
 *
 * This type is used internally by MetaMask to add additional metadata to the
 * account object. It's should not be used by external applications.
 */
export type InternalAccount = Infer<typeof InternalAccountStruct>;
