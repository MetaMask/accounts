import type {
  MessageTypeProperty,
  MessageTypes,
  TypedMessage,
} from '@metamask/eth-sig-util';

/**
 * The canonical order in which EIP-712 domain fields are encoded when a
 * contract builds its `DOMAIN_SEPARATOR`. The derived `EIP712Domain` type
 * must list fields in this order for the host-computed domain separator to
 * match the contract's on-chain value.
 */
const CANONICAL_EIP712_DOMAIN_FIELD_ORDER = [
  'name',
  'version',
  'chainId',
  'verifyingContract',
  'salt',
] as const;

type Eip712DomainField = (typeof CANONICAL_EIP712_DOMAIN_FIELD_ORDER)[number];

/**
 * The EIP-712 ABI type of each canonical domain field.
 */
const EIP712_DOMAIN_FIELD_TYPES: Record<Eip712DomainField, string> = {
  name: 'string',
  version: 'string',
  chainId: 'uint256',
  verifyingContract: 'address',
  salt: 'bytes32',
};

/**
 * Returns typed data with a concrete `EIP712Domain` type derived from the
 * keys of the `domain` object (ethers-style), when the payload omits or
 * empties it. Payloads that already declare it are returned untouched.
 *
 * This is needed because `@metamask/eth-sig-util`'s `sanitizeData` defaults a
 * missing `types.EIP712Domain` to an empty array, which produces a zero-field
 * domain struct. The domain separator is then computed from
 * `keccak256("EIP712Domain()")` instead of the actual domain values, and the
 * Ledger device (whose Gen5 Ethereum app diverges on the zero-field domain
 * case) receives an undefined-behavior payload. Deriving the field list up
 * front makes both the device payload and the local signature verification
 * use the real domain values.
 *
 * @param data - The typed data payload to normalize.
 * @returns The normalized typed data, or the input untouched when its
 * `EIP712Domain` type is already declared or when there is nothing to derive.
 * @see {@link https://github.com/MetaMask/metamask-extension/issues/42625}
 */
export function withDerivedEip712Domain<Types extends MessageTypes>(
  data: TypedMessage<Types>,
): TypedMessage<Types> {
  const declared = data.types?.EIP712Domain;
  if (declared && declared.length > 0) {
    // Well-formed payload — zero behavior change.
    return data;
  }

  const present = CANONICAL_EIP712_DOMAIN_FIELD_ORDER.filter(
    (field) =>
      data.domain?.[field] !== undefined && data.domain?.[field] !== null,
  );

  if (present.length === 0) {
    // Nothing to derive from.
    return data;
  }

  return {
    ...data,
    types: {
      ...data.types,
      EIP712Domain: present.map(
        (field): MessageTypeProperty => ({
          name: field,
          type: EIP712_DOMAIN_FIELD_TYPES[field],
        }),
      ),
    },
  } as TypedMessage<Types>;
}
