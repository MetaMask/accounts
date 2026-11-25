/**
 * A namespaced key-derivation purpose with a stable, non-empty scope and a
 * non-negative integer version. Derivation helpers must also validate this
 * format at runtime; the template type alone cannot enforce every constraint.
 */
export type KeyDerivationPurpose = `metamask:${string}:v${number}`;
