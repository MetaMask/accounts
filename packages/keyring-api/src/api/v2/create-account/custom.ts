import { literal, type, type Infer } from '@metamask/superstruct';

/**
 * Struct for {@link CreateAccountCustomOptions}.
 */
export const CreateAccountCustomOptionsStruct = type({
  /**
   * The type of the options.
   */
  type: literal('custom'),
});

/**
 * Options for creating an account using a custom, keyring-specific method.
 *
 * This is an opaque type that allows keyrings with non-standard account
 * creation flows to define their own options. Keyrings using this type
 * should declare `custom.createAccounts: true` in their capabilities.
 *
 * The actual options accepted by the keyring are implementation-specific
 * and not validated by this struct beyond the `type` field. Adaptors should
 * handle any additional options as needed and add type intersections as necessary.
 */
export type CreateAccountCustomOptions = Infer<
  typeof CreateAccountCustomOptionsStruct
>;
