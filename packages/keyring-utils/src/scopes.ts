import type { CaipChainId } from '@metamask/utils';
import { KnownCaipNamespace } from '@metamask/utils';

// We do not use the `EthScope` from `@metamask/keyring-api` here to avoid pulling it
// as a dependency.
export const ETH_SCOPE_EOA = `${KnownCaipNamespace.Eip155}:0`;

// We use a string prefix when comparing EOAs to avoid unecessary splits.
const ETH_SCOPE_PREFIX = `${KnownCaipNamespace.Eip155}:`;

/**
 * Check if scope is matching with another scopes. It also supports the special
 * case of `eip155:0` for EVM EOA chain ID which is compatible with any EVM chain
 * ID (`eip155:*`).
 *
 * @param scope - The scope (CAIP-2 chain ID) to check.
 * @param other - Another scope to compare to.
 * @returns True if both scope are compatible, false otherwise.
 */
export function isScopeEqual(scope: CaipChainId, other: CaipChainId): boolean {
  const isScopeEoa = scope === ETH_SCOPE_EOA;
  const isOtherEoa = other === ETH_SCOPE_EOA;

  // Special case for EOA scopes (we check on both sides).
  if (isScopeEoa) {
    return other.startsWith(ETH_SCOPE_PREFIX);
  }
  if (isOtherEoa) {
    return scope.startsWith(ETH_SCOPE_PREFIX);
  }

  // Normal case, if both scopes strictly match, then they are compatible.
  return scope === other;
}

/**
 * Check if `scope` matches any scope from `scopes`. It also supports the special
 * case of `eip155:0` for EVM EOA chain ID which is compatible with any EVM chain
 * ID (`eip155:*`).
 *
 * @param scope - The scope (CAIP-2 chain ID) to check.
 * @param scopes - The list of scopes to check against.
 * @returns True if `scope` matches any scope from `scopes`, false otherwise.
 */
export function isScopeEqualToAny(
  scope: CaipChainId,
  scopes: CaipChainId[],
): boolean {
  return scopes.some((other) => isScopeEqual(scope, other));
}
