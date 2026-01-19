import type {
  NetworkSession,
  PartyId,
  RandomNumberGenerator,
  SessionId,
} from '@metamask/mfa-wallet-interface';
import { bytesToHex } from '@metamask/utils';

export type NetworkIdentity = {
  partyId: PartyId;
};

export type NetworkManager = {
  createIdentity: () => Promise<NetworkIdentity>;
  createSession: (
    identity: NetworkIdentity,
    parties: PartyId[],
    sessionId: SessionId,
  ) => Promise<NetworkSession>;
};

/**
 * Generates a random session ID.
 *
 * @param rng - The random number generator to use.
 * @returns The session ID.
 */
export function generateSessionId(rng: RandomNumberGenerator): SessionId {
  return bytesToHex(rng.generateRandomBytes(32));
}
