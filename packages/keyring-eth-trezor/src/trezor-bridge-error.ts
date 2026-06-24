type TrezorErrorPayload = {
  error?: string;
  code?: string;
};

/**
 * Creates an Error from a Trezor Connect unsuccessful response payload.
 * Preserves machine-readable Trezor error codes when present.
 *
 * @param payload - The error payload from a Trezor Connect response.
 * @returns An Error with optional `.code` for downstream mapping.
 */
export function createErrorFromTrezorResponse(
  payload: TrezorErrorPayload | undefined,
): Error {
  const message = payload?.error ?? 'Unknown error';
  const error = new Error(message);

  if (payload?.code !== undefined) {
    Object.assign(error, { code: payload.code });
  }

  return error;
}
