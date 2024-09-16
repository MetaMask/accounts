import type { Infer, Struct } from '@metamask/superstruct';
import { boolean, string, number } from '@metamask/superstruct';

import { BtcAccountType, EthAccountType, KeyringAccountStruct } from '../api';
import { BtcP2wpkhAccountStruct } from '../btc/types';
import { EthEoaAccountStruct, EthErc4337AccountStruct } from '../eth/types';
import { exactOptional, object } from '../superstruct';

export type InternalAccountType = EthAccountType | BtcAccountType;

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

/**
 * Creates an `InternalAccount` from an existing account `superstruct` object.
 *
 * @param accountStruct - An account `superstruct` object.
 * @returns The `InternalAccount` associated to `accountStruct`.
 */
function asInternalAccountStruct<Account, AccountSchema>(
  accountStruct: Struct<Account, AccountSchema>,
) {
  return object({
    ...accountStruct.schema,
    ...InternalAccountMetadataStruct.schema,
  });
}

export const InternalEthEoaAccountStruct =
  asInternalAccountStruct(EthEoaAccountStruct);

export const InternalEthErc4337AccountStruct = asInternalAccountStruct(
  EthErc4337AccountStruct,
);

export const InternalBtcP2wpkhAccountStruct = asInternalAccountStruct(
  BtcP2wpkhAccountStruct,
);

export type InternalEthEoaAccount = Infer<typeof InternalEthEoaAccountStruct>;

export type InternalEthErc4337Account = Infer<
  typeof InternalEthErc4337AccountStruct
>;

export type InternalBtcP2wpkhAccount = Infer<
  typeof InternalBtcP2wpkhAccountStruct
>;

export const InternalAccountStructs: Record<
  string,
  | Struct<InternalEthEoaAccount>
  | Struct<InternalEthErc4337Account>
  | Struct<InternalBtcP2wpkhAccount>
> = {
  [`${EthAccountType.Eoa}`]: InternalEthEoaAccountStruct,
  [`${EthAccountType.Erc4337}`]: InternalEthErc4337AccountStruct,
  [`${BtcAccountType.P2wpkh}`]: InternalBtcP2wpkhAccountStruct,
};

export type InternalAccountTypes =
  | InternalEthEoaAccount
  | InternalEthErc4337Account
  | InternalBtcP2wpkhAccount;

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
