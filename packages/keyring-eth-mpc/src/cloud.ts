import type { PartyId } from '@metamask/mfa-wallet-interface';
import { base64ToBytes, bytesToBase64 } from '@metamask/utils';

export type LoadKeyShareBackupResult = {
  encryptedKeyShare: Uint8Array;
  epoch: number;
};

export type CheckKeyShareResult = {
  latestShareEpoch?: number;
  latestBackupEpoch?: number;
  activeEpoch?: number;
};

/**
 * Fetch JSON from the MPC backend, throwing on non-OK responses.
 *
 * @param url - The request URL.
 * @param token - Profile token sent as a Bearer header.
 * @param body - The JSON request body.
 * @param errorPrefix - Prefix for the thrown error message.
 * @returns The parsed JSON body, or `undefined` when the response is empty.
 */
async function postJson<Response>(
  url: string,
  token: string,
  body: Record<string, unknown>,
  errorPrefix: string,
): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${errorPrefix}: ${response.statusText}`);
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as Response;
  }
  return JSON.parse(text) as Response;
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
 * Start DKG on the backend for a new key (appends epoch 1; does not activate).
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
 * Start a backend signing session for the active share epoch.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA and challenge.
 * @param opts.data - Message hash to sign.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 * @param opts.shareEpoch - Local share epoch (must equal backend activeEpoch).
 */
export async function sign(opts: {
  baseURL: string;
  token: string;
  data: Uint8Array;
  clientNetId: PartyId;
  nonce: string;
  shareEpoch: number;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/sign`,
    opts.token,
    {
      data: bytesToBase64(opts.data),
      clientNetId: opts.clientNetId,
      nonce: opts.nonce,
      shareEpoch: opts.shareEpoch,
    },
    'Failed to initialize cloud sign session',
  );
}

/**
 * Start a backend share-rotation session (appends next epoch; does not activate).
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 * @param opts.expectedActiveEpoch - Current active epoch on client and server.
 */
export async function rotateKeyShares(opts: {
  baseURL: string;
  token: string;
  clientNetId: PartyId;
  nonce: string;
  expectedActiveEpoch: number;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/rotate-key-shares`,
    opts.token,
    {
      clientNetId: opts.clientNetId,
      nonce: opts.nonce,
      expectedActiveEpoch: opts.expectedActiveEpoch,
    },
    'Failed to initialize cloud key rotation session',
  );
}

/**
 * Store an encrypted key-share backup for a share epoch.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.epoch - Share epoch this backup belongs to.
 * @param opts.attemptNonce - DKG client nonce for that epoch (rejects stale backups).
 * @param opts.encryptedKeyShare - Encrypted key share ciphertext.
 */
export async function storeKeyShareBackup(opts: {
  baseURL: string;
  token: string;
  epoch: number;
  attemptNonce: string;
  encryptedKeyShare: Uint8Array;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/store-key-share-backup`,
    opts.token,
    {
      epoch: opts.epoch,
      attemptNonce: opts.attemptNonce,
      encryptedKeyShare: bytesToBase64(opts.encryptedKeyShare),
    },
    'Failed to store key share backup',
  );
}

/**
 * Return the latest share/backup epochs and the active epoch from the backend.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token (2FA not required).
 * @returns Epoch metadata from the backend.
 */
export async function checkKeyShare(opts: {
  baseURL: string;
  token: string;
}): Promise<CheckKeyShareResult> {
  return await postJson<CheckKeyShareResult>(
    `${opts.baseURL}/check-key-share`,
    opts.token,
    {},
    'Failed to check key share',
  );
}

/**
 * Activate a share epoch after its share and backup are present.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @param opts.epoch - Epoch to activate.
 */
export async function setActiveEpoch(opts: {
  baseURL: string;
  token: string;
  epoch: number;
}): Promise<void> {
  await postJson(
    `${opts.baseURL}/set-active-epoch`,
    opts.token,
    {
      epoch: opts.epoch,
    },
    'Failed to set active epoch',
  );
}

/**
 * Load the encrypted key-share backup for the active epoch.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token with 2FA.
 * @returns The ciphertext and share epoch.
 */
export async function loadKeyShareBackup(opts: {
  baseURL: string;
  token: string;
}): Promise<LoadKeyShareBackupResult> {
  const data = await postJson<{
    encryptedKeyShare: string;
    epoch: number;
  }>(
    `${opts.baseURL}/load-key-share-backup`,
    opts.token,
    {},
    'Failed to load key share backup',
  );
  return {
    encryptedKeyShare: base64ToBytes(data.encryptedKeyShare),
    epoch: data.epoch,
  };
}
