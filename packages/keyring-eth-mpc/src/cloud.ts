import type { PartyId } from '@metamask/mfa-wallet-interface';
import { bytesToBase64 } from '@metamask/utils';

/**
 * Initialize a cloud keygen session
 *
 * @param opts - The options for the cloud keygen session
 * @param opts.localId - The local ID of the device
 * @param opts.sessionNonce - The nonce of the session
 * @param opts.baseURL - The base URL of the cloud service
 * @param opts.verifierIds - The IDs of the verifiers
 * @returns The cloud ID of the device
 */
export async function initCloudKeyGen(opts: {
  baseURL: string;
  localId: PartyId;
  sessionNonce: string;
  verifierIds: string[];
}): Promise<{ cloudId: string }> {
  const response = await fetch(`${opts.baseURL}/create-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      custodianId: opts.localId,
      nonce: opts.sessionNonce,
      protocol: 'cl24-secp256k1',
      verifierIds: opts.verifierIds,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to initialize cloud keygen session: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return { cloudId: data.serverCustodianId };
}

/**
 * Initialize a cloud key update session
 *
 * @param opts - The options for the cloud key update session
 * @param opts.baseURL - The base URL of the cloud service
 * @param opts.keyId - The ID of the key
 * @param opts.custodianId - The party ID of the calling custodian
 * @param opts.newCustodianId - The party ID of the custodian to add
 * @param opts.sessionNonce - The nonce of the session
 * @param opts.token - The token for the verifier
 */
export async function initCloudKeyUpdate(opts: {
  baseURL: string;
  keyId: string;
  custodianId: PartyId;
  newCustodianId: string;
  sessionNonce: string;
  token: string;
}): Promise<void> {
  const response = await fetch(`${opts.baseURL}/update-custodians`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      keyId: opts.keyId,
      custodianId: opts.custodianId,
      newCustodianId: opts.newCustodianId,
      nonce: opts.sessionNonce,
      dkmProtocol: 'cl24-secp256k1',
      token: opts.token,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to initialize cloud key update session: ${response.statusText}`,
    );
  }
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
 * @param opts.token - The token for the verifier
 */
export async function initCloudSign(opts: {
  baseURL: string;
  keyId: string;
  localId: PartyId;
  sessionNonce: string;
  message: Uint8Array;
  token: string;
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
      token: opts.token,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to initialize cloud sign session: ${response.statusText}`,
    );
  }
}
