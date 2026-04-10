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
  CL24PartialThresholdKeySerializer,
  CL24ThresholdKeySerializer,
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import { Dkls19TssLib } from '@metamask/mfa-wallet-dkls19-lib';
import type {
  PartyId,
  PartialThresholdKey,
  RandomNumberGenerator,
  ThresholdKey,
} from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import {
  MfaNetworkIdentitySerializer,
  MfaNetworkManager,
  createScopedSessionId,
} from '@metamask/mfa-wallet-network';
import type { Dkls19Lib } from '@metamask/mpc-libs-interface';
import { bytesToHex, hexToBytes, type Hex, type Json } from '@metamask/utils';

import { initCloudKeyGen, initCloudKeyUpdate, initCloudSign } from './cloud';
import type {
  Custodian,
  MPCKeyringOpts,
  MPCKeyringSerializer,
  MPCKeyringState,
  ThresholdKeyId,
} from './types';
import {
  equalAddresses,
  getSignedTypedDataHash,
  parseCustodians,
  parseDkls19Setup,
  parseEthSig,
  parseSelectedVerifierIndex,
  parseSignedTypedDataVersion,
  parseThresholdKeyId,
  parseVerifierIds,
  publicKeyToAddressHex,
  generateSessionNonce,
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

  readonly #dkls19Lib: Dkls19Lib;

  readonly #dkm: CL24DKM;

  #state?: MPCKeyringState;

  readonly #cloudURL: string;

  readonly #serializer: MPCKeyringSerializer;

  readonly #getVerifierToken: (verifierId: string) => Promise<string>;

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
    this.#dkm = new CL24DKM(secp256k1Curve, this.#rng);
    this.#dkls19Lib = opts.dkls19Lib;
    this.#cloudURL = opts.cloudURL;
    this.#serializer = {
      thresholdKey: new CL24ThresholdKeySerializer(),
      partialThresholdKey: new CL24PartialThresholdKeySerializer(),
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
    if (!this.#state) {
      return {};
    }
    return {
      networkIdentity: this.#serializer.networkIdentity.toJson(
        this.#state.networkIdentity,
      ),
      keyShare: this.#serializer.thresholdKey.toJson(this.#state.keyShare),
      keyId: this.#state.keyId,
      custodians: this.#state.custodians,
      verifierIds: this.#state.verifierIds,
      selectedVerifierIndex: this.#state.selectedVerifierIndex,
      dkls19Setup: bytesToHex(this.#state.dkls19Setup),
    };
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

    if (
      'networkIdentity' in state &&
      'keyShare' in state &&
      'keyId' in state &&
      'dkls19Setup' in state &&
      'custodians' in state &&
      'verifierIds' in state &&
      'selectedVerifierIndex' in state
    ) {
      this.#state = {
        networkIdentity: this.#serializer.networkIdentity.fromJson(
          state.networkIdentity,
        ),
        keyShare: this.#serializer.thresholdKey.fromJson(state.keyShare),
        keyId: parseThresholdKeyId(state.keyId),
        dkls19Setup: parseDkls19Setup(state.dkls19Setup),
        custodians: parseCustodians(state.custodians),
        verifierIds: parseVerifierIds(state.verifierIds),
        selectedVerifierIndex: parseSelectedVerifierIndex(
          state.selectedVerifierIndex,
        ),
      };
    }
  }

  /**
   * Get the custodian identifier from the network identity.
   *
   * @returns The network identity party ID.
   */
  getCustodianId(): string {
    return this.#assertState().networkIdentity.partyId;
  }

  /**
   * Get the custodians associated with the current threshold key.
   *
   * @returns The custodians with their party IDs and types.
   */
  getCustodians(): Custodian[] {
    if (!this.#state) {
      throw new Error('Keyring not initialized');
    }
    return this.#state.custodians;
  }

  /**
   * Add a new custodian to the keyring using serialized join data.
   *
   * @param joinData - The serialized join data from {@link createJoinData}.
   */
  async addCustodian(joinData: string): Promise<void> {
    const state = this.#assertState();
    const { networkIdentity } = state;
    if (state.keyShare.threshold !== 2) {
      throw new Error('Key threshold must be 2');
    }

    const localId = networkIdentity.partyId;
    const cloudCustodian = state.custodians.find(
      (custodian) => custodian.type === 'cloud',
    );
    if (!cloudCustodian) {
      throw new Error('Cloud custodian not found');
    }

    // Deserialize join data to get ephemeral joiner identity and nonce
    const { joinerIdentity: joinerIdentityJson, nonce } = JSON.parse(joinData);
    const ephemeralJoinerIdentity =
      this.#serializer.networkIdentity.fromJson(joinerIdentityJson);
    const ephemeralJoinerId = ephemeralJoinerIdentity.partyId;

    const totalStartTime = performance.now();
    const session1StartTime = performance.now();

    // Session 1: establish with ephemeral joiner identity and nonce,
    // receive the actual static joiner identity
    const joinSession1Id = createScopedSessionId(
      [ephemeralJoinerId, localId],
      nonce,
    );
    const joinSession1 = await this.#networkManager.createSession(
      networkIdentity,
      joinSession1Id,
    );

    const staticJoinerIdBytes = await joinSession1.receiveMessage(
      ephemeralJoinerId,
      'static-id',
    );
    const custodianId = new TextDecoder().decode(staticJoinerIdBytes);
    await joinSession1.disconnect();

    const session1Time = performance.now() - session1StartTime;
    console.log('addCustodian session1 time', session1Time);
    const session2StartTime = performance.now();

    // Session 2: establish with static joiner identity,
    // send partial key, key id, and fresh nonce
    const sessionNonce = generateSessionNonce(this.#rng);

    const joinSession2Id = createScopedSessionId([custodianId, localId], nonce);
    const joinSession2 = await this.#networkManager.createSession(
      networkIdentity,
      joinSession2Id,
    );

    const partialKey: PartialThresholdKey = {
      custodians: state.keyShare.custodians,
      shareIndexes: state.keyShare.shareIndexes,
      threshold: state.keyShare.threshold,
    };
    const partialKeyJson =
      this.#serializer.partialThresholdKey.toJson(partialKey);
    const joinPayload = JSON.stringify({
      cloudCustodian: cloudCustodian.partyId,
      nonce: sessionNonce,
      partialKey: partialKeyJson,
      keyId: state.keyId,
    });
    joinSession2.sendMessage(
      custodianId,
      'join-data',
      new TextEncoder().encode(joinPayload),
    );

    const session2Time = performance.now() - session2StartTime;
    console.log('addCustodian session2 time', session2Time);
    const initCloudStartTime = performance.now();

    // Notify the cloud custodian
    const onlineCustodians = [localId, cloudCustodian.partyId];
    const newCustodians = [...onlineCustodians, custodianId];

    const verifierId = this.getSelectedVerifierId();
    const token = await this.#getVerifierToken(verifierId);

    await initCloudKeyUpdate({
      keyId: state.keyId,
      onlineCustodians,
      newCustodians,
      sessionNonce,
      baseURL: this.#cloudURL,
      token,
    });

    const initCloudTime = performance.now() - initCloudStartTime;
    console.log('initCloudKeyUpdate time', initCloudTime);
    const updateKeyStartTime = performance.now();

    const { newKey, dkls19Setup } = await this.#runKeyUpdate({
      identity: networkIdentity,
      key: state.keyShare,
      onlineCustodians,
      newCustodians,
      sessionNonce,
    });

    const updateKeyTime = performance.now() - updateKeyStartTime;
    console.log('dkm.updateKey time', updateKeyTime);

    const totalTime = performance.now() - totalStartTime;
    console.log('addCustodian total time', totalTime);

    // We disconnect session 2 after the key update to avoid
    // a bug where messages are not sent when disconnecting immediately.
    await joinSession2.disconnect();

    this.#state = {
      ...state,
      keyShare: newKey,
      dkls19Setup,
      custodians: [...state.custodians, { partyId: custodianId, type: 'user' }],
    };
  }

  /**
   * Remove a user custodian from the threshold key via resharing.
   * The local device and cloud custodian must remain; only additional
   * user custodians (added with {@link addCustodian}) can be removed.
   *
   * @param custodianId - Party ID of the custodian to remove.
   */
  async removeCustodian(custodianId: string): Promise<void> {
    const state = this.#assertState();
    const { networkIdentity, keyShare } = state;
    if (keyShare.threshold !== 2) {
      throw new Error('Key threshold must be 2');
    }

    const localId = networkIdentity.partyId;
    if (custodianId === localId) {
      throw new Error('Cannot remove local custodian');
    }

    const cloudCustodian = state.custodians.find(
      (custodian) => custodian.type === 'cloud',
    );
    if (!cloudCustodian) {
      throw new Error('Cloud custodian not found');
    }
    if (custodianId === cloudCustodian.partyId) {
      throw new Error('Cannot remove cloud custodian');
    }

    const toRemove = state.custodians.find(
      (custodian) => custodian.partyId === custodianId,
    );
    if (!toRemove) {
      throw new Error('Custodian not found');
    }
    if (toRemove.type !== 'user') {
      throw new Error('Only user custodians can be removed');
    }
    if (!keyShare.custodians.includes(custodianId)) {
      throw new Error('Custodian not part of threshold key');
    }

    const onlineCustodians = [localId, cloudCustodian.partyId];

    const sessionNonce = generateSessionNonce(this.#rng);
    const verifierId = this.getSelectedVerifierId();
    const token = await this.#getVerifierToken(verifierId);

    const totalStartTime = performance.now();
    const initCloudStartTime = performance.now();

    const newCustodians = onlineCustodians;
    await initCloudKeyUpdate({
      keyId: state.keyId,
      onlineCustodians,
      newCustodians,
      sessionNonce,
      baseURL: this.#cloudURL,
      token,
    });

    const initCloudTime = performance.now() - initCloudStartTime;
    console.log('initCloudKeyUpdate time', initCloudTime);
    const updateKeyStartTime = performance.now();

    const { newKey, dkls19Setup } = await this.#runKeyUpdate({
      identity: networkIdentity,
      key: keyShare,
      onlineCustodians,
      newCustodians,
      sessionNonce,
    });

    const updateKeyTime = performance.now() - updateKeyStartTime;
    console.log('dkm.updateKey (removeCustodian) time', updateKeyTime);

    const totalTime = performance.now() - totalStartTime;
    console.log('removeCustodian total time', totalTime);

    this.#state = {
      ...state,
      keyShare: newKey,
      dkls19Setup,
      custodians: state.custodians.filter(
        (custodian) => custodian.partyId !== custodianId,
      ),
    };
  }

  getVerifierIds(): string[] {
    if (!this.#state) {
      throw new Error('Keyring not initialized');
    }
    return this.#state.verifierIds;
  }

  selectVerifier(verifierIndex: number): string {
    if (!this.#state) {
      throw new Error('Keyring not initialized');
    } else if (
      verifierIndex < 0 ||
      verifierIndex >= this.#state.verifierIds.length
    ) {
      throw new Error('Invalid verifier index');
    }
    this.#state.selectedVerifierIndex = verifierIndex;
    return this.#state.verifierIds[verifierIndex] as string;
  }

  getSelectedVerifierId(): string {
    if (!this.#state) {
      throw new Error('Keyring not initialized');
    } else if (
      this.#state.selectedVerifierIndex < 0 ||
      this.#state.selectedVerifierIndex >= this.#state.verifierIds.length
    ) {
      throw new Error('Invalid selected verifier index');
    }
    return this.#state.verifierIds[this.#state.selectedVerifierIndex] as string;
  }

  /**
   * Generate join data for a new custodian.
   * Creates a fresh ephemeral joiner identity and session nonce,
   * and serializes them along with the initiator's public ID.
   *
   * @returns Serialized join data string.
   */
  async createJoinData(): Promise<string> {
    const initiatorId = this.#assertState().networkIdentity.partyId;
    const ephemeralJoinerIdentity = await this.#networkManager.createIdentity();
    const nonce = generateSessionNonce(this.#rng);

    return JSON.stringify({
      initiatorId,
      joinerIdentity: this.#serializer.networkIdentity.toJson(
        ephemeralJoinerIdentity,
      ),
      nonce,
    });
  }

  async setup(
    opts: { verifierIds: string[] } & (
      | { mode?: 'create' }
      | { mode: 'join'; joinData: string }
    ),
  ): Promise<void> {
    const { verifierIds } = opts;
    const mode = 'mode' in opts ? opts.mode ?? 'create' : 'create';

    if (this.#state) {
      throw new Error('Keyring already setup');
    } else if (verifierIds.length < 1) {
      throw new Error('At least one verifier ID is required');
    }

    if (mode === 'join') {
      const { joinData } = opts as { joinData: string };
      await this.#setupJoin({ verifierIds, joinData });
    } else {
      await this.#setupCreate(verifierIds);
    }
  }

  async #setupCreate(verifierIds: string[]): Promise<void> {
    const networkIdentity = await this.#networkManager.createIdentity();
    const localId = networkIdentity.partyId;

    const totalStartTime = performance.now();
    const initCloudStartTime = performance.now();

    const sessionNonce = generateSessionNonce(this.#rng);
    const { cloudId } = await initCloudKeyGen({
      localId,
      sessionNonce,
      baseURL: this.#cloudURL,
      verifierIds,
    });

    const initCloudTime = performance.now() - initCloudStartTime;
    console.log('initCloudKeyGen time', initCloudTime);
    const createKeyStartTime = performance.now();

    const custodians = [localId, cloudId];
    const { key, keyId, dkls19Setup } = await this.#runKeyGeneration({
      identity: networkIdentity,
      custodians,
      threshold: 2,
      sessionNonce,
    });

    const createKeyTime = performance.now() - createKeyStartTime;
    console.log('dkm.createKey time', createKeyTime);

    const totalTime = performance.now() - totalStartTime;
    console.log('setupCreate total time', totalTime);

    this.#applyKeyState({
      networkIdentity,
      keyShare: key,
      keyId,
      dkls19Setup,
      custodians: [
        { partyId: localId, type: 'user' },
        { partyId: cloudId, type: 'cloud' },
      ],
      verifierIds,
      selectedVerifierIndex: 0,
    });
  }

  async #setupJoin(opts: {
    verifierIds: string[];
    joinData: string;
  }): Promise<void> {
    const { verifierIds, joinData } = opts;

    // Deserialize join data to get initiator id, ephemeral joiner identity, nonce
    const {
      initiatorId: initiator,
      joinerIdentity: joinerIdentityJson,
      nonce,
    } = JSON.parse(joinData);
    const ephemeralJoinerIdentity =
      this.#serializer.networkIdentity.fromJson(joinerIdentityJson);

    // Setup own static identity
    const networkIdentity = await this.#networkManager.createIdentity();
    const myId = networkIdentity.partyId;

    const totalStartTime = performance.now();
    const session1StartTime = performance.now();

    // Session 1: establish with initiator using ephemeral joiner identity,
    // send own static identity (public id)
    const joinSession1Id = createScopedSessionId(
      [ephemeralJoinerIdentity.partyId, initiator],
      nonce,
    );
    const joinSession1 = await this.#networkManager.createSession(
      ephemeralJoinerIdentity,
      joinSession1Id,
    );

    joinSession1.sendMessage(
      initiator,
      'static-id',
      new TextEncoder().encode(myId),
    );

    const session1Time = performance.now() - session1StartTime;
    console.log('setupJoin session1 time', session1Time);
    const session2StartTime = performance.now();

    // Session 2: establish with initiator using static identity,
    // receive partial key, key id, and nonce
    const joinSession2Id = createScopedSessionId([myId, initiator], nonce);
    const joinSession2 = await this.#networkManager.createSession(
      networkIdentity,
      joinSession2Id,
    );

    const joinPayloadBytes = await joinSession2.receiveMessage(
      initiator,
      'join-data',
    );
    await joinSession2.disconnect();
    // We disconnect session 1 after receiving message from initiator to avoid
    // a bug where messages are not sent when disconnecting immediately.
    await joinSession1.disconnect();

    const session2Time = performance.now() - session2StartTime;
    console.log('setupJoin session2 time', session2Time);

    const joinPayload = JSON.parse(new TextDecoder().decode(joinPayloadBytes));
    const {
      cloudCustodian,
      nonce: sessionNonce,
      partialKey: partialKeyJson,
      keyId,
    } = joinPayload;

    const partialKey =
      this.#serializer.partialThresholdKey.fromJson(partialKeyJson);

    const onlineCustodians = [initiator, cloudCustodian];
    const newCustodians = [...onlineCustodians, myId];

    const updateKeyStartTime = performance.now();

    const { newKey, dkls19Setup } = await this.#runKeyUpdate({
      identity: networkIdentity,
      key: partialKey,
      onlineCustodians,
      newCustodians,
      sessionNonce,
    });

    const updateKeyTime = performance.now() - updateKeyStartTime;
    console.log('dkm.updateKey time', updateKeyTime);

    const totalTime = performance.now() - totalStartTime;
    console.log('setupJoin total time', totalTime);

    this.#applyKeyState({
      networkIdentity,
      keyShare: newKey,
      dkls19Setup,
      keyId,
      custodians: [
        { partyId: initiator, type: 'user' },
        { partyId: cloudCustodian, type: 'cloud' },
        { partyId: myId, type: 'user' },
      ],
      verifierIds,
      selectedVerifierIndex: 0,
    });
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
    if (!this.#state) {
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
    const state = this.#assertState();
    const { networkIdentity } = state;

    const verifierId = state.verifierIds[state.selectedVerifierIndex];
    if (!verifierId) {
      throw new Error('Selected verifier index out of bounds');
    }

    const { publicKey } = state.keyShare;

    const addr = this.#address();
    if (!equalAddresses(address, addr)) {
      throw new Error(`account ${address} not found`);
    }

    const localId = networkIdentity.partyId;
    const cloudCustodian = state.custodians.find(
      (custodian) => custodian.type === 'cloud',
    );
    if (!cloudCustodian) {
      throw new Error('Cloud custodian not found');
    }

    const signers = [localId, cloudCustodian.partyId];
    const sessionNonce = generateSessionNonce(this.#rng);
    const sessionId = createScopedSessionId(signers, sessionNonce);
    const message = hash;
    const token = await this.#getVerifierToken(verifierId);

    const totalStartTime = performance.now();
    const initCloudStartTime = performance.now();

    await initCloudSign({
      keyId: state.keyId,
      localId,
      sessionNonce,
      message,
      baseURL: this.#cloudURL,
      token,
    });

    const initCloudTime = performance.now() - initCloudStartTime;
    console.log('initCloudSign time', initCloudTime);
    const dkls19StartTime = performance.now();

    const networkSession = await this.#networkManager.createSession(
      networkIdentity,
      sessionId,
    );

    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng, true);
    const { signature } = await dkls19.sign({
      key: state.keyShare,
      signers,
      message,
      networkSession,
      setup: state.dkls19Setup,
    });

    const dkls19SignTime = performance.now() - dkls19StartTime;
    console.log('dkls19.sign time', dkls19SignTime);

    const totalTime = performance.now() - totalStartTime;
    console.log('total time', totalTime);

    await networkSession.disconnect();

    return toEthSig(signature, hash, publicKey);
  }

  async #runKeyGeneration(opts: {
    identity: MfaNetworkIdentity;
    custodians: PartyId[];
    threshold: number;
    sessionNonce: string;
  }): Promise<{
    key: ThresholdKey;
    keyId: ThresholdKeyId;
    dkls19Setup: Uint8Array;
  }> {
    const sessionId = createScopedSessionId(opts.custodians, opts.sessionNonce);
    const rootSession = await this.#networkManager.createSession(
      opts.identity,
      sessionId,
    );

    const createKeySession = rootSession.createSubsession('create-key');

    const key = await this.#dkm.createKey({
      custodians: opts.custodians,
      threshold: opts.threshold,
      networkSession: createKeySession,
    });

    const dkls19SetupSession = rootSession.createSubsession('dkls19-setup');

    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng, true);
    const dkls19Setup = await dkls19.setup({
      custodians: opts.custodians,
      shareIndexes: key.shareIndexes,
      networkSession: dkls19SetupSession,
    });

    const keyId = rootSession.sessionId;
    await rootSession.disconnect();
    return { key, keyId, dkls19Setup };
  }

  async #runKeyUpdate(opts: {
    identity: MfaNetworkIdentity;
    key: ThresholdKey | PartialThresholdKey;
    onlineCustodians: PartyId[];
    newCustodians: PartyId[];
    sessionNonce: string;
  }): Promise<{ newKey: ThresholdKey; dkls19Setup: Uint8Array }> {
    const sessionId = createScopedSessionId(
      opts.newCustodians,
      opts.sessionNonce,
    );
    const rootSession = await this.#networkManager.createSession(
      opts.identity,
      sessionId,
    );

    const updateKeySession = rootSession.createSubsession('update-key');
    const newKey = await this.#dkm.updateKey({
      key: opts.key,
      onlineCustodians: opts.onlineCustodians,
      newCustodians: opts.newCustodians,
      networkSession: updateKeySession,
    });

    const dkls19SetupSession = rootSession.createSubsession('dkls19-setup');
    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng, true);
    const dkls19Setup = await dkls19.setup({
      custodians: opts.newCustodians,
      shareIndexes: newKey.shareIndexes,
      networkSession: dkls19SetupSession,
    });

    await rootSession.disconnect();
    return { newKey, dkls19Setup };
  }

  #applyKeyState(state: MPCKeyringState): void {
    this.#state = state;
  }

  #assertState(): MPCKeyringState {
    if (!this.#state) {
      throw new Error('Keyring not initialized');
    }
    return this.#state;
  }

  #address(): Hex {
    return publicKeyToAddressHex(this.#assertState().keyShare.publicKey);
  }
}
