/**
 * Initialize a cloud keygen session
 *
 * @param opts - The options for the cloud keygen session
 * @param opts.localId - The local ID of the device
 * @returns The cloud ID of the device
 */
export async function initCloudKeyGen(opts: {
  localId: string;
}): Promise<{ cloudId: string }> {}

/**
 * Initialize a cloud sign session
 *
 * @param opts - The options for the cloud sign session
 * @param opts.keyId - The ID of the key
 * @param opts.sessionId - The ID of the session
 * @param opts.message - The message to sign
 */
export async function initCloudSign(opts: {
  keyId: string;
  sessionId: string;
  message: Uint8Array;
}): Promise<void> {}
