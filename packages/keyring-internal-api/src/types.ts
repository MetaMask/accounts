/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
// FIXME: Those rules seem to be triggering a false positive on the `InternalAccountStructs`
// and `InternalAccountTypes`.

import {
  BtcAccountType,
  EthAccountType,
  KeyringAccountStruct,
  SolAccountType,
  BtcP2wpkhAccountStruct,
  EthEoaAccountStruct,
  EthErc4337AccountStruct,
  SolDataAccountStruct,
} from '@metamask/keyring-api';
import { exactOptional, object } from '@metamask/keyring-utils';
import type { Infer, Struct } from '@metamask/superstruct';
import { boolean, string, number, array } from '@metamask/superstruct';
import { CaipChainIdStruct } from '@metamask/utils';

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

    /**
     * List of chain IDs that the account is compatible with.
     *
     * This differs from the `scopes` field. The `scopes` field can include
     * namespaces, which are used to indicate that the account is compatible
     * with all chains within a given namespace.
     *
     * Namespaces are useful because it might not be possible to list every
     * individual chain at the time of account creation. This is due to the
     * dynamic nature of chain availability (new chains may be added in the
     * future) and because the account creator may not know which specific
     * networks are supported by the client.
     *
     * The `chainIds` field provides a precise list of supported chains and is
     * dynamically updated by the client to reflect the networks currently
     * compatible with the account.
     */
    chainIds: array(CaipChainIdStruct),
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

export const InternalSolDataAccountStruct = object({
  ...SolDataAccountStruct.schema,
  ...InternalAccountMetadataStruct.schema,
});

export type InternalEthEoaAccount = Infer<typeof InternalEthEoaAccountStruct>;

export type InternalEthErc4337Account = Infer<
  typeof InternalEthErc4337AccountStruct
>;

export type InternalBtcP2wpkhAccount = Infer<
  typeof InternalBtcP2wpkhAccountStruct
>;

export type InternalSolDataAccount = Infer<typeof InternalSolDataAccountStruct>;

export const InternalAccountStructs: Record<
  string,
  | Struct<InternalEthEoaAccount>
  | Struct<InternalEthErc4337Account>
  | Struct<InternalBtcP2wpkhAccount>
  | Struct<InternalSolDataAccount>
> = {
  [`${EthAccountType.Eoa}`]: InternalEthEoaAccountStruct,
  [`${EthAccountType.Erc4337}`]: InternalEthErc4337AccountStruct,
  [`${BtcAccountType.P2wpkh}`]: InternalBtcP2wpkhAccountStruct,
  [`${SolAccountType.DataAccount}`]: InternalSolDataAccountStruct,
};

export type InternalAccountTypes =
  | InternalEthEoaAccount
  | InternalEthErc4337Account
  | InternalBtcP2wpkhAccount
  | InternalSolDataAccount;

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
