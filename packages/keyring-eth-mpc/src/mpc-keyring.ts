import type { TypedTransaction } from '@ethereumjs/tx';
import { hashPersonalMessage } from '@ethereumjs/util';
import type {
  TypedDataV1,
  TypedMessage,
  SignTypedDataVersion,
  MessageTypes,
} from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import {
  CL24DKM,
  CL24ThresholdKeySerializer,
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import { Dkls19TssLib } from '@metamask/mfa-wallet-dkls19-lib';
import type {
  RandomNumberGenerator,
  ThresholdKey,
} from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import {
  MfaNetworkIdentitySerializer,
  MfaNetworkManager,
  createScopedSessionId,
} from '@metamask/mfa-wallet-network';
import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';
import { bytesToHex, hexToBytes, type Hex, type Json } from '@metamask/utils';

import { initCloudKeyGen, initCloudSign } from './cloud';
import type {
  MPCKeyringOpts,
  MPCKeyringSerializer,
  ThresholdKeyId,
} from './types';
import {
  equalAddresses,
  getSignedTypedDataHash,
  parseEthSig,
  parseSelectedVerifierIndex,
  parseSignedTypedDataVersion,
  parseThresholdKeyId,
  parseVerifierIds,
  publicKeyToAddressHex,
  toEthSig,
} from './util';

const mpcKeyringType = 'MPC Keyring';

export const uninitializedResponderState: Json = {
  initRole: 'responder',
};

export class MPCKeyring implements Keyring {
  readonly type: string = mpcKeyringType;

  readonly #rng: RandomNumberGenerator;

  readonly #networkManager: MfaNetworkManager;

  readonly #dkls19Lib: Dkls19WasmLib;

  #networkIdentity?: MfaNetworkIdentity;

  #keyShare?: ThresholdKey;

  #keyId?: ThresholdKeyId;

  #verifierIds?: string[];

  #selectedVerifierIndex?: number;

  readonly #cloudURL: string;

  readonly #serializer: MPCKeyringSerializer;

  readonly #getVerifierToken: (verifierId: string) => Promise<string>;

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
    this.#dkls19Lib = opts.dkls19Lib;
    this.#cloudURL = opts.cloudURL;
    this.#serializer = {
      thresholdKey: new CL24ThresholdKeySerializer(),
      networkIdentity: new MfaNetworkIdentitySerializer(),
    };
    this.#networkManager = new MfaNetworkManager({
      url: opts.relayerURL,
      randomBytes: {
        getRandomValues: (array: Uint8Array): Uint8Array => {
          const bytes = opts.getRandomBytes(array.length);
          array.set(bytes);
          return array;
        },
      },
      ...(opts.getTransportToken && {
        getToken: opts.getTransportToken,
      }),
      ...(opts.webSocket === undefined ? {} : { websocket: opts.webSocket }),
    });
    this.#getVerifierToken = opts.getVerifierToken;
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<Json> {
    const state: Json = {};
    if (this.#networkIdentity) {
      state.networkIdentity = this.#serializer.networkIdentity.toJson(
        this.#networkIdentity,
      );
    }
    if (this.#keyShare) {
      state.keyShare = this.#serializer.thresholdKey.toJson(this.#keyShare);
    }
    if (this.#keyId) {
      state.keyId = this.#keyId;
    }
    if (this.#verifierIds) {
      state.verifierIds = this.#verifierIds;
    }
    if (this.#selectedVerifierIndex) {
      state.selectedVerifierIndex = this.#selectedVerifierIndex;
    }
    return state;
  }

  /**
   * Initialize the keyring with the given serialized state.
   *
   * @param state - The serialized state of the keyring.
   */
  async deserialize(state: Json): Promise<void> {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state');
    }

    if ('networkIdentity' in state) {
      this.#networkIdentity = this.#serializer.networkIdentity.fromJson(
        state.networkIdentity,
      );
    }

    if ('keyShare' in state) {
      this.#keyShare = this.#serializer.thresholdKey.fromJson(state.keyShare);
    }

    if ('keyId' in state) {
      this.#keyId = parseThresholdKeyId(state.keyId);
    }

    if ('verifierIds' in state) {
      this.#verifierIds = parseVerifierIds(state.verifierIds);
    }

    if ('selectedVerifierIndex' in state) {
      this.#selectedVerifierIndex = parseSelectedVerifierIndex(
        state.selectedVerifierIndex,
      );
    }
  }

  /**
   * Get the custodian identifier from the network identity.
   *
   * @returns The network identity party ID.
   */
  getCustodianId(): string {
    if (!this.#networkIdentity) {
      throw new Error('Network identity not initialized');
    }
    return this.#networkIdentity.partyId;
  }

  getVerifierIds(): string[] {
    if (!this.#verifierIds) {
      throw new Error('Verifier IDs not initialized');
    }
    return this.#verifierIds;
  }

  selectVerifier(verifierIndex: number): string {
    if (!this.#verifierIds) {
      throw new Error('Verifier IDs not initialized');
    } else if (verifierIndex < 0 || verifierIndex >= this.#verifierIds.length) {
      throw new Error('Invalid verifier index');
    }
    this.#selectedVerifierIndex = verifierIndex;
    return this.#verifierIds[verifierIndex] as string;
  }

  getSelectedVerifierId(): string {
    if (!this.#verifierIds) {
      throw new Error('Verifier IDs not initialized');
    } else if (!this.#selectedVerifierIndex) {
      throw new Error('Selected verifier index not initialized');
    } else if (
      this.#selectedVerifierIndex < 0 ||
      this.#selectedVerifierIndex >= this.#verifierIds.length
    ) {
      throw new Error('Invalid selected verifier index');
    }
    return this.#verifierIds[this.#selectedVerifierIndex] as string;
  }

  async setup({ verifierIds }: { verifierIds: string[] }): Promise<void> {
    if (this.#keyShare || this.#networkIdentity || this.#keyId) {
      throw new Error('Keyring already setup');
    } else if (verifierIds.length < 1) {
      throw new Error('At least one verifier ID is required');
    }

    const dkm = new CL24DKM(secp256k1Curve, this.#rng);

    const net = this.#networkManager;
    const networkIdentity = await net.createIdentity();
    const localId = networkIdentity.partyId;
    const sessionNonce = bytesToHex(this.#rng.generateRandomBytes(32));
    const { cloudId } = await initCloudKeyGen({
      localId,
      sessionNonce,
      baseURL: this.#cloudURL,
      verifierIds,
    });
    const custodians = [localId, cloudId];
    const threshold = 2;

    const sessionId = createScopedSessionId(custodians, sessionNonce);
    const networkSession = await net.createSession(networkIdentity, sessionId);

    this.#networkIdentity = networkIdentity;
    this.#keyShare = await dkm.createKey({
      custodians,
      threshold,
      networkSession,
    });
    this.#keyId = networkSession.sessionId;
    this.#verifierIds = verifierIds;
    this.#selectedVerifierIndex = 0;

    await networkSession.disconnect();
  }

  /**
   * Add new accounts to the keyring. The accounts will be derived
   * sequentially from the root HD wallet, using increasing indices.
   *
   * @param numberOfAccounts - The number of accounts to add.
   * @returns The addresses of the new accounts.
   */
  async addAccounts(numberOfAccounts = 1): Promise<Hex[]> {
    throw new Error(`addAccounts(${numberOfAccounts}): not implemented`);
  }

  /**
   * Get the addresses of all accounts in the keyring.
   *
   * @returns The addresses of all accounts in the keyring.
   */
  async getAccounts(): Promise<Hex[]> {
    if (!this.#keyShare) {
      return [];
    }

    const addr = this.#address();
    return [addr];
  }

  /**
   * Get the public address of the account for the given app key origin.
   *
   * @param address - The address of the account.
   * @param origin - The origin of the app requesting the account.
   * @returns The public address of the account.
   */
  async getAppKeyAddress(address: Hex, origin: string): Promise<Hex> {
    throw new Error(`getAppKeyAddress(${address}, ${origin}): not implemented`);
  }

  /**
   * Sign a transaction using the specified account.
   *
   * @param address - The address of the account.
   * @param tx - The transaction to sign.
   * @param _opts - The options for signing the transaction.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
    _opts = {},
  ): Promise<TypedTransaction> {
    const message = tx.getHashedMessageToSign();

    const signature = await this.#signHash(address, message);

    const { r, s, v } = parseEthSig(signature);

    const signedTx = tx.addSignature(v, r, s);
    return signedTx;
  }

  /**
   * Sign a personal message using the specified account.
   * This method is compatible with the `personal_sign` RPC method.
   *
   * @param address - The address of the account.
   * @param msgHex - The message to sign.
   * @param _opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signPersonalMessage(
    address: Hex,
    msgHex: string,
    _opts?: Record<string, unknown>,
  ): Promise<string> {
    const rawMsg = hexToBytes(msgHex);
    const msgHash = hashPersonalMessage(rawMsg);

    const signature = await this.#signHash(address, msgHash);
    return bytesToHex(signature);
  }

  /**
   * Sign a typed message using the specified account.
   * This method is compatible with the `eth_signTypedData` RPC method.
   *
   * @param address - The address of the account.
   * @param data - The typed data to sign.
   * @param options - The options for signing the message.
   * @returns The signature of the message.
   */
  async signTypedData<
    Version extends SignTypedDataVersion,
    Types extends MessageTypes,
    Options extends { version?: Version },
  >(
    address: Hex,
    data: Version extends 'V1' ? TypedDataV1 : TypedMessage<Types>,
    options?: Options,
  ): Promise<string> {
    const version = parseSignedTypedDataVersion(options);

    const messageHash = getSignedTypedDataHash(data, version);

    const signature = await this.#signHash(address, messageHash);
    return bytesToHex(signature);
  }

  async #signHash(address: Hex, hash: Uint8Array): Promise<Uint8Array> {
    if (!this.#keyShare) {
      throw new Error(`keyshare not initialized`);
    } else if (!this.#networkIdentity) {
      throw new Error(`network credentials not initialized`);
    } else if (!this.#keyId) {
      throw new Error(`key id not initialized`);
    } else if (!this.#verifierIds) {
      throw new Error('Verifier IDs not initialized');
    } else if (!this.#selectedVerifierIndex) {
      throw new Error('Selected verifier index not initialized');
    }

    const verifierId = this.#verifierIds[this.#selectedVerifierIndex];
    if (!verifierId) {
      throw new Error('Selected verifier index out of bounds');
    }

    const { custodians, publicKey } = this.#keyShare;

    const addr = this.#address();
    if (!equalAddresses(address, addr)) {
      throw new Error(`account ${address} not found`);
    }

    const sessionNonce = bytesToHex(this.#rng.generateRandomBytes(32));
    const sessionId = createScopedSessionId(custodians, sessionNonce);
    const message = hash;
    const token = await this.#getVerifierToken(verifierId);

    await initCloudSign({
      keyId: this.#keyId,
      localId: this.#networkIdentity.partyId,
      sessionNonce,
      message,
      baseURL: this.#cloudURL,
      token,
    });

    const networkSession = await this.#networkManager.createSession(
      this.#networkIdentity,
      sessionId,
    );

    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng, true);
    const { signature } = await dkls19.sign({
      key: this.#keyShare,
      signers: custodians,
      message,
      networkSession,
    });

    await networkSession.disconnect();

    return toEthSig(signature, hash, publicKey);
  }

  #address(): Hex {
    if (!this.#keyShare) {
      throw new Error(`keyshare not initialized`);
    }
    return publicKeyToAddressHex(this.#keyShare.publicKey);
  }
}
