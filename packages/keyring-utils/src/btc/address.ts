import type { AddressType } from 'bitcoin-address-validation';
import { validate, Network, getAddressInfo } from 'bitcoin-address-validation';

/**
 * Returns whether an address is on the Bitcoin mainnet.
 *
 * @param address - The address to check.
 * @param type - The address type to check.
 * @returns `true` if the address is valid, `false` otherwise.
 */
export function isBtcAddress(address: string, type: AddressType): boolean {
  const addressInfo = getAddressInfo(address);
  return addressInfo.type === type;
}

/**
 * Returns whether an address is on the Bitcoin mainnet.
 *
 * @param address - The address to check.
 * @returns `true` if the address is on the Bitcoin mainnet, `false` otherwise.
 */
export function isBtcMainnetAddress(address: string): boolean {
  return validate(address, Network.mainnet);
}

/**
 * Returns whether an address is on the Bitcoin testnet.
 *
 * @param address - The address to check.
 * @returns `true` if the address is on the Bitcoin testnet, `false` otherwise.
 */
export function isBtcTestnetAddress(address: string): boolean {
  return validate(address, Network.testnet);
}
