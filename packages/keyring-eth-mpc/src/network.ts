import type {
  NetworkSession,
  PartyId,
  SessionId,
} from '@metamask/mfa-wallet-interface';

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
 * @returns The session ID.
 */
export function generateSessionId(): SessionId {

}
