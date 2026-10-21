import type { PartyId } from '@metamask/mfa-wallet-interface';
import type { MoneyAccountSignatureRequest } from '@metamask/money-account-mfa-whitelist';
import type { Infer, Struct } from '@metamask/superstruct';
import {
  exactOptional,
  integer,
  is,
  literal,
  min,
  nonempty,
  sensitive,
  string,
  type,
} from '@metamask/superstruct';
import { base64ToBytes, bytesToBase64 } from '@metamask/utils';

import { MFA_REQUIRED_CODE } from './types.js';

export type LoadKeyShareBackupResult = {
  encryptedKeyShare: Uint8Array;
  epoch: number;
};

const shareEpochStruct = min(integer(), 1);

const NetIdResponseStruct = type({
  netId: nonempty(string()),
});

const CheckKeyShareResponseStruct = type({
  latestShareEpoch: exactOptional(shareEpochStruct),
  latestBackupEpoch: exactOptional(shareEpochStruct),
  activeEpoch: exactOptional(shareEpochStruct),
});

export type CheckKeyShareResult = Infer<typeof CheckKeyShareResponseStruct>;

const LoadKeyShareBackupResponseStruct = type({
  encryptedKeyShare: sensitive(nonempty(string())),
  epoch: shareEpochStruct,
});

/**
 * Accept `value` when it matches `struct`.
 *
 * Failures use a fixed message so the response body is not included.
 *
 * @param value - Parsed JSON body.
 * @param struct - Expected response shape.
 * @param errorPrefix - Prefix for the thrown error message.
 * @returns The validated value.
 */
function readStruct<Schema>(
  value: unknown,
  struct: Struct<Schema>,
  errorPrefix: string,
): Schema {
  if (!is(value, struct)) {
    throw new Error(`${errorPrefix}: bad response format`);
  }
  return value;
}

/**
 * Cloud HTTP calls must finish within this window. Keyring methods run under
 * the controller mutex, so a backend that never responds would block every
 * keyring operation until the client restarts.
 */
const CLOUD_REQUEST_TIMEOUT_MS = 30_000;

/**
 * Fetch a URL, aborting if the backend does not respond in time.
 *
 * @param url - The request URL.
 * @param init - Fetch options. `signal` is set by this function.
 * @param errorPrefix - Prefix for the thrown timeout error.
 * @returns The fetch response.
 * @throws If the request exceeds `CLOUD_REQUEST_TIMEOUT_MS`.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  errorPrefix: string,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, CLOUD_REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `${errorPrefix}: timed out after ${CLOUD_REQUEST_TIMEOUT_MS}ms`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    errorPrefix,
  );
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
  const response = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    },
    errorPrefix,
  );
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
  const data = readStruct(
    await postJson(
      `${opts.baseURL}/net-id`,
      opts.token,
      {},
      'Failed to get server network id',
    ),
    NetIdResponseStruct,
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

const signErrorPrefix = 'Failed to initialize cloud sign session';

const MfaRequiredBodyStruct = type({
  code: literal(MFA_REQUIRED_CODE),
});

export type SignResult = 'ok' | typeof MFA_REQUIRED_CODE;

/**
 * Read a JSON body, or `undefined` when the body is empty or not JSON.
 *
 * @param response - The fetch response.
 * @returns The parsed body, or `undefined`.
 */
async function readJsonBody(response: Response): Promise<unknown> {
  try {
    const text = await response.text();
    if (text.length === 0) {
      return undefined;
    }
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Start a backend signing session for the active share epoch.
 *
 * A response body of `{ "code": "mfa_required" }` means the backend still
 * requires MFA. Every other non-OK response is an error.
 *
 * @param opts - Request options.
 * @param opts.baseURL - MPC backend base URL.
 * @param opts.token - Profile token. 2FA is included when the client requires MFA.
 * @param opts.data - Message hash to sign.
 * @param opts.clientNetId - Client network id.
 * @param opts.nonce - Client session nonce.
 * @param opts.shareEpoch - Local share epoch (must equal backend activeEpoch).
 * @param opts.request - Signature request the hash was computed from.
 * @returns `ok` when the session starts, or `mfa_required` when the backend requires MFA.
 */
export async function sign(opts: {
  baseURL: string;
  token: string;
  data: Uint8Array;
  clientNetId: PartyId;
  nonce: string;
  shareEpoch: number;
  request?: MoneyAccountSignatureRequest;
}): Promise<SignResult> {
  const response = await fetchWithTimeout(
    `${opts.baseURL}/sign`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${opts.token}`,
      },
      body: JSON.stringify({
        data: bytesToBase64(opts.data),
        clientNetId: opts.clientNetId,
        nonce: opts.nonce,
        shareEpoch: opts.shareEpoch,
        ...(opts.request === undefined ? {} : { request: opts.request }),
      }),
    },
    signErrorPrefix,
  );

  const body = await readJsonBody(response);
  if (is(body, MfaRequiredBodyStruct)) {
    return MFA_REQUIRED_CODE;
  }
  if (!response.ok) {
    throw new Error(`${signErrorPrefix}: ${response.statusText}`);
  }
  return 'ok';
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
  return readStruct(
    await postJson(
      `${opts.baseURL}/check-key-share`,
      opts.token,
      {},
      'Failed to check key share',
    ),
    CheckKeyShareResponseStruct,
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
  const data = readStruct(
    await getJson(
      `${opts.baseURL}/load-key-share-backup`,
      opts.token,
      'Failed to load key share backup',
    ),
    LoadKeyShareBackupResponseStruct,
    'Failed to load key share backup',
  );
  return {
    encryptedKeyShare: base64ToBytes(data.encryptedKeyShare),
    epoch: data.epoch,
  };
}
