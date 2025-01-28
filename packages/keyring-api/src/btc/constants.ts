/* istanbul ignore file */

/**
 * Scopes for Bitcoin account type. See {@link KeyringAccount.scopes}.
 */
export enum BtcScope {
  Mainnet = 'bip122:000000000019d6689c085ae165831e93',
  Testnet = 'bip122:000000000933ea01ad0ee984209779ba',
  Testnet4 = 'bip122:00000000da84f2bafbbc53dee25a72ae',
  Signet = 'bip122:00000008819873e925422c1ff0f99f7c',
  Regtest = 'bip122:regtest',
}
