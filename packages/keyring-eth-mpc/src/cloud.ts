import type { PartyId } from '@metamask/mfa-wallet-interface';
import { bytesToBase64 } from '@metamask/utils';

/**
 * Initialize a cloud keygen session
 *
 * @param opts - The options for the cloud keygen session
 * @param opts.localId - The local ID of the device
 * @param opts.sessionNonce - The nonce of the session
 * @param opts.baseURL - The base URL of the cloud service
 * @returns The cloud ID of the device
 */
export async function initCloudKeyGen(opts: {
  baseURL: string;
  localId: PartyId;
  sessionNonce: string;
}): Promise<{ cloudId: string }> {
  const response = await fetch(`${opts.baseURL}/createKey`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      custodianId: opts.localId,
      nonce: opts.sessionNonce,
      keyType: 'secp256k1',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to initialize cloud keygen session: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return { cloudId: data.cloudId };
}

/**
 * Initialize a cloud sign session
 *
 * @param opts - The options for the cloud sign session
 * @param opts.baseURL - The base URL of the cloud service
 * @param opts.keyId - The ID of the key
 * @param opts.localId - The local ID of the device
 * @param opts.sessionNonce - The nonce of the session
 * @param opts.message - The message to sign
 */
export async function initCloudSign(opts: {
  baseURL: string;
  keyId: string;
  localId: PartyId;
  sessionNonce: string;
  message: Uint8Array;
}): Promise<void> {
  const response = await fetch(`${opts.baseURL}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: opts.keyId,
      custodianId: opts.localId,
      nonce: opts.sessionNonce,
      message: bytesToBase64(opts.message),
      protocol: 'dkls19',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to initialize cloud sign session: ${response.statusText}`,
    );
  }
}
