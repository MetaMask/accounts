import type { PartyId } from '@metamask/mfa-wallet-interface';
import { base64ToBytes, bytesToBase64 } from '@metamask/utils';

export type LoadKeyShareBackupResult = {
  encryptedKeyShare: Uint8Array;
  backupId: string;
};

/**
 * Parse a fetch response as JSON, throwing on non-OK status.
 *
 * @param response - The fetch response.
 * @param errorPrefix - Prefix for the thrown error message.
 * @returns The parsed JSON body, or `undefined` when the response is empty.
 */
async function parseJsonResponse<Result>(
  response: Response,
  errorPrefix: string,
): Promise<Result> {
  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.statusText}`);
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as Result;
  }
  return JSON.parse(text) as Result;
}

/**
 * GET JSON from the MPC backend, throwing on non-OK responses.
 *
 * @param url - The request URL.
 * @param token - Profile token sent as a Bearer header.
 * @param errorPrefix - Prefix for the thrown error message.
 * @returns The parsed JSON body, or `undefined` when the response is empty.
 */
async function getJson<Result>(
  url: string,
  token: string,
  errorPrefix: string,
): Promise<Result> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseJsonResponse(response, errorPrefix);
}

/**
 * POST JSON to the MPC backend, throwing on non-OK responses.
 *
 * @param url - The request URL.
 * @param token - Profile token sent as a Bearer header.
 * @param body - The JSON request body.
 * @param errorPrefix - Prefix for the thrown error message.
 * @returns The parsed JSON body, or `undefined` when the response is empty.
 */
async function postJson<Result>(
  url: string,
  token: string,
  body: Record<string, unknown>,
  errorPrefix: string,
): Promise<Result> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return parseJsonResponse(response, errorPrefix);
}

/**
 * Return the server network id for this profile, creating one if needed.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token.
 * @returns The server network id.
 */
export async function getNetId(opts: {
  baseURL: string;
  token: string;
}): Promise<PartyId> {
  const data = await postJson<{ netId: string }>(
    `${opts.baseURL}/net-id`,
    opts.token,
    {},
    'Failed to get server network id',
  );
  return data.netId;
}

/**
 * Start DKG on the backend for a new key.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 */
export async function createKey(opts: {
  baseURL: string;
  token: string;
  clientNetId: PartyId;
  nonce: string;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/create-key`,
    opts.token,
    {
      clientNetId: opts.clientNetId,
      nonce: opts.nonce,
    },
    'Failed to initialize cloud keygen session',
  );
}

/**
 * Authorize this client network id to use the existing key share.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.clientNetId - Client network id.
 */
export async function registerClient(opts: {
  baseURL: string;
  token: string;
  clientNetId: PartyId;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/register-client`,
    opts.token,
    {
      clientNetId: opts.clientNetId,
    },
    'Failed to register client',
  );
}

/**
 * Start a backend signing session.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA and challenge.
 * @param opts.data - Message hash to sign.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 */
export async function sign(opts: {
  baseURL: string;
  token: string;
  data: Uint8Array;
  clientNetId: PartyId;
  nonce: string;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/sign`,
    opts.token,
    {
      data: bytesToBase64(opts.data),
      clientNetId: opts.clientNetId,
      nonce: opts.nonce,
    },
    'Failed to initialize cloud sign session',
  );
}

/**
 * Start a backend share-rotation session.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 */
export async function rotateKeyShares(opts: {
  baseURL: string;
  token: string;
  clientNetId: PartyId;
  nonce: string;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/rotate-key-shares`,
    opts.token,
    {
      clientNetId: opts.clientNetId,
      nonce: opts.nonce,
    },
    'Failed to initialize cloud key rotation session',
  );
}

/**
 * Store an encrypted key-share backup and its client-minted id.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.backupId - Opaque backup id minted by the client.
 * @param opts.encryptedKeyShare - Encrypted key share ciphertext.
 */
export async function storeKeyShareBackup(opts: {
  baseURL: string;
  token: string;
  backupId: string;
  encryptedKeyShare: Uint8Array;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/store-key-share-backup`,
    opts.token,
    {
      backupId: opts.backupId,
      encryptedKeyShare: bytesToBase64(opts.encryptedKeyShare),
    },
    'Failed to store key share backup',
  );
}

/**
 * Return the backup id currently stored on the backend.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token (2FA not required).
 * @returns The stored backup id, or `null` if none exists.
 */
export async function checkKeyShareBackupId(opts: {
  baseURL: string;
  token: string;
}): Promise<string | null> {
  const data = await postJson<{ backupId?: string | null }>(
    `${opts.baseURL}/check-key-share-backup-id`,
    opts.token,
    {},
    'Failed to check key share backup id',
  );
  return typeof data.backupId === 'string' ? data.backupId : null;
}

/**
 * Load the encrypted key-share backup from the backend.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @returns The ciphertext and backup id.
 */
export async function loadKeyShareBackup(opts: {
  baseURL: string;
  token: string;
}): Promise<LoadKeyShareBackupResult> {
  const data = await getJson<{
    encryptedKeyShare: string;
    backupId: string;
  }>(
    `${opts.baseURL}/load-key-share-backup`,
    opts.token,
    'Failed to load key share backup',
  );
  return {
    encryptedKeyShare: base64ToBytes(data.encryptedKeyShare),
    backupId: data.backupId,
  };
}
