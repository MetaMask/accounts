/**
 * A namespaced key-derivation purpose with a stable, non-empty scope and a
 * non-negative integer version. Callers are responsible for these constraints;
 * the template type alone cannot enforce all of them.
 */
export type KeyDerivationPurpose = `metamask:${string}:v${number}`;
