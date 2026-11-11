import { SignTypedDataVersion, TypedDataUtils } from '@metamask/eth-sig-util';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { bytesToHex, isPlainObject, remove0x } from '@metamask/utils';

/**
 * Recursively convert `bigint` values to strings.
 *
 * @param value - The value to sanitize.
 * @returns The sanitized value.
 */
function sanitize(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitize(entry)]),
    );
  }

  return value;
}

/**
 * Add the EIP-712 V4 domain separator and message hashes to typed data
 * as expected by Trezor devices.
 *
 * This matches the behavior of `transformTypedData` in
 * `@trezor/connect-plugin-ethereum@9.0.5`. It is reimplemented here since that
 * version expects `@metamask/eth-sig-util` v8, which hashing functions return a
 * `Buffer` instead of `Uint8Array`.
 *
 * @param data - The typed data.
 * @returns The typed data, with its domain separator and message hashes.
 */
export function transformTypedData<Types extends MessageTypes>(
  data: TypedMessage<Types>,
): TypedMessage<Types> & {
  domain_separator_hash: string;
  message_hash: string | null;
} {
  const { types, primaryType, domain, message } =
    TypedDataUtils.sanitizeData(data);

  const domainHash = remove0x(
    bytesToHex(
      TypedDataUtils.hashStruct(
        'EIP712Domain',
        sanitize(domain) as Record<string, unknown>,
        types,
        SignTypedDataVersion.V4,
      ),
    ),
  );

  const messageHash =
    primaryType === 'EIP712Domain'
      ? null
      : remove0x(
        bytesToHex(
          TypedDataUtils.hashStruct(
            primaryType.toString(),
            sanitize(message) as Record<string, unknown>,
            types,
            SignTypedDataVersion.V4,
          ),
        ),
      );

  return {
    ...data,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    domain_separator_hash: domainHash,
    // eslint-disable-line @typescript-eslint/naming-convention
    message_hash: messageHash
  };
}
