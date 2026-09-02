import type { TypedTransaction } from '@ethereumjs/tx';
import { hashPersonalMessage } from '@ethereumjs/util';
import type {
  TypedDataV1,
  TypedMessage,
  SignTypedDataVersion,
  MessageTypes,
  EIP7702Authorization,
} from '@metamask/eth-sig-util';
import { hashEIP7702Authorization } from '@metamask/eth-sig-util';
import type { Keyring } from '@metamask/keyring-utils';
import {
  CL24DKM,
  CL24ThresholdKeySerializer,
  dealersFromCL24Key,
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import type { CL24ThresholdKey } from '@metamask/mfa-wallet-cl24-lib';
import { Dkls23TssLib } from '@metamask/mfa-wallet-dkls23-lib';
import type {
  PartyId,
  RandomNumberGenerator,
  RootNetworkSession,
  ShareBinding,
} from '@metamask/mfa-wallet-interface';
import type { MfaNetworkIdentity } from '@metamask/mfa-wallet-network';
import {
  MfaNetworkIdentitySerializer,
  MfaNetworkManager,
  createScopedSessionId,
} from '@metamask/mfa-wallet-network';
import { bytesToHex, hexToBytes } from '@metamask/utils';
import type { Hex, Json } from '@metamask/utils';

import {
  checkKeyShareBackupId,
  createKey as startCreateKey,
  getNetId,
  loadKeyShareBackup,
  registerClient,
  rotateKeyShares as startRotateKeyShares,
  sign as startSign,
  storeKeyShareBackup,
} from './cloud';
import type {
  MPCKeyringOpts,
  MPCKeyringSerializer,
  MPCKeyringSetupParams,
  MPCKeyringState,
  MPCKeyringStorageState,
  ProfileTokenOpts,
} from './types';
import {
  AES_GCM_IV_LENGTH,
  createBackupId,
  decryptBytes,
  encryptBytes,
  equalAddresses,
  generateSessionNonce,
  getSignedTypedDataHash,
  parseBackupId,
  parseEthSig,
  parseServerNetId,
  parseSignedTypedDataVersion,
  parseTssSetup,
  publicKeyToAddressHex,
  toEthSig,
} from './util';

const mpcKeyringType = 'MPC Keyring';
const TSS_HAVE_SETUP_MESSAGE_TYPE = 'tss-have-setup';
const CLIENT_SHARE_INDEX = 0;
const SERVER_SHARE_INDEX = 1;

/**
 * Party net ids indexed by 0-based share slot.
 *
 * @param clientNetId - Client (share 0) network id.
 * @param serverNetId - Server (share 1) network id.
 * @returns Net ids in share-slot order.
 */
function partyNetIds(clientNetId: PartyId, serverNetId: PartyId): PartyId[] {
  const netIds: PartyId[] = [];
  netIds[CLIENT_SHARE_INDEX] = clientNetId;
  netIds[SERVER_SHARE_INDEX] = serverNetId;
  return netIds;
}

/**
 * Share bindings for the client/server pair.
 *
 * @param clientNetId - Client (share 0) network id.
 * @param serverNetId - Server (share 1) network id.
 * @returns Bindings with fixed share indexes.
 */
function shareBindings(
  clientNetId: PartyId,
  serverNetId: PartyId,
): ShareBinding[] {
  return [
    { netId: clientNetId, shareIndex: CLIENT_SHARE_INDEX },
    { netId: serverNetId, shareIndex: SERVER_SHARE_INDEX },
  ];
}

export class MPCKeyring implements Keyring {
  readonly type: string = mpcKeyringType;

  readonly #rng: RandomNumberGenerator;

  readonly #networkManager: MfaNetworkManager;

  readonly #tss: Dkls23TssLib;

  readonly #dkm: CL24DKM;

  #state?: MPCKeyringStorageState;

  readonly #cloudURL: string;

  readonly #serializer: MPCKeyringSerializer;

  readonly #getProfileToken: (opts?: ProfileTokenOpts) => Promise<string>;

  readonly #getBackupEncryptionKey: () => Promise<Uint8Array>;

  #signQueue: Promise<void> = Promise.resolve();

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
    this.#dkm = new CL24DKM(secp256k1Curve, this.#rng);
    this.#tss = new Dkls23TssLib(opts.dkls23Lib);
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
    this.#getProfileToken = opts.getProfileToken;
    this.#getBackupEncryptionKey = opts.getBackupEncryptionKey;
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
    if (this.#state.status === 'uninitialized') {
      return this.#state.setup;
    }

    const { netCreds, keyShare, serverNetId, backupId, tssSetup } = this.#state;
    return {
      netCreds: this.#serializer.networkIdentity.toJson(netCreds),
      keyShare: this.#serializer.thresholdKey.toJson(keyShare),
      serverNetId,
      backupId,
      tssSetup: tssSetup === null ? null : bytesToHex(tssSetup),
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
    const stateObj = state as Record<string, Json>;

    if (
      'netCreds' in stateObj &&
      'keyShare' in stateObj &&
      'serverNetId' in stateObj &&
      'backupId' in stateObj &&
      'tssSetup' in stateObj
    ) {
      this.#state = {
        status: 'initialized',
        netCreds: this.#serializer.networkIdentity.fromJson(stateObj.netCreds),
        keyShare: this.#serializer.thresholdKey.fromJson(stateObj.keyShare),
        serverNetId: parseServerNetId(stateObj.serverNetId),
        backupId: parseBackupId(stateObj.backupId),
        tssSetup: parseTssSetup(stateObj.tssSetup),
      };
      return;
    }

    const setup = this.#parseSetupParams(stateObj);
    if (setup) {
      this.#state = {
        status: 'uninitialized',
        setup,
      };
    }
  }

  /**
   * Run key generation or import. `mode` may be passed directly, or taken
   * from setup params previously stored via {@link deserialize}.
   *
   * @param mode - Create a new key or import from the backend backup.
   */
  async init(mode?: MPCKeyringSetupParams['mode']): Promise<void> {
    if (this.#state?.status === 'initialized') {
      return;
    }

    const resolvedMode =
      mode ??
      (this.#state?.status === 'uninitialized'
        ? this.#state.setup.mode
        : undefined);
    if (resolvedMode === undefined) {
      return;
    }

    if (resolvedMode === 'create') {
      await this.#setupCreate();
    } else {
      await this.#setupImport();
    }
  }

  /**
   * Rotate client and server shares. Existing TSS setup remains valid.
   */
  async rotateKeyShares(): Promise<void> {
    const state = this.#assertState();
    const { netCreds, serverNetId } = state;
    let { keyShare } = state;

    const token = await this.#getProfileToken({ twoFactor: true });
    const nonce = generateSessionNonce(this.#rng);
    await startRotateKeyShares({
      baseURL: this.#cloudURL,
      token,
      clientNetId: netCreds.partyId,
      nonce,
    });

    const netSession = await this.#createNetworkSession(
      netCreds,
      serverNetId,
      nonce,
    );
    try {
      const custodians = partyNetIds(netCreds.partyId, serverNetId);
      keyShare = await this.#dkm.rotateKeyShares({
        key: keyShare,
        dealers: dealersFromCL24Key(keyShare, custodians),
        custodians,
        networkSession: netSession.createSubsession('rotate-key-shares'),
      });
    } finally {
      await netSession.disconnect();
    }

    const backupId = createBackupId(this.#rng);
    await storeKeyShareBackup({
      baseURL: this.#cloudURL,
      token,
      backupId,
      encryptedKeyShare: await this.#encryptKeyShare(keyShare),
    });

    this.#applyKeyState({
      ...state,
      keyShare,
      backupId,
    });
  }

  /**
   * Compare the local backup id with the id stored on the backend.
   *
   * @returns Whether the backup ids match.
   */
  async checkKeyShare(): Promise<boolean> {
    const { backupId } = this.#assertState();
    const token = await this.#getProfileToken();
    const serverBackupId = await checkKeyShareBackupId({
      baseURL: this.#cloudURL,
      token,
    });
    return backupId === serverBackupId;
  }

  /**
   * Refresh `keyShare` and `backupId` from the backend backup.
   * `netCreds`, `serverNetId`, and `tssSetup` are unchanged.
   */
  async syncKeyShare(): Promise<void> {
    const state = this.#assertState();
    const token = await this.#getProfileToken({ twoFactor: true });
    const { encryptedKeyShare, backupId } = await loadKeyShareBackup({
      baseURL: this.#cloudURL,
      token,
    });
    const keyShare = await this.#decryptKeyShare(encryptedKeyShare);
    this.#applyKeyState({
      ...state,
      keyShare,
      backupId,
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
    if (!this.#state || this.#state.status !== 'initialized') {
      return [];
    }

    return [this.#address()];
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

  /**
   * Sign an EIP-7702 authorization using the specified account.
   *
   * @param address - The address of the account.
   * @param authorization - The EIP-7702 authorization to sign.
   * @param _opts - The options for signing the authorization.
   * @returns The signature of the authorization.
   */
  async signEip7702Authorization(
    address: Hex,
    authorization: EIP7702Authorization,
    _opts?: Record<string, unknown>,
  ): Promise<string> {
    const messageHash = new Uint8Array(hashEIP7702Authorization(authorization));
    const signature = await this.#signHash(address, messageHash);
    return bytesToHex(signature);
  }

  async #setupCreate(): Promise<void> {
    const token = await this.#getProfileToken({ twoFactor: true });
    const netCreds = await this.#networkManager.createIdentity();
    const serverNetId = await getNetId({
      baseURL: this.#cloudURL,
      token,
    });

    const nonce = generateSessionNonce(this.#rng);
    await startCreateKey({
      baseURL: this.#cloudURL,
      token,
      clientNetId: netCreds.partyId,
      nonce,
    });

    const netSession = await this.#createNetworkSession(
      netCreds,
      serverNetId,
      nonce,
    );
    let keyShare: CL24ThresholdKey;
    let tssSetup: Uint8Array;
    try {
      const custodians = partyNetIds(netCreds.partyId, serverNetId);
      const bindings = shareBindings(netCreds.partyId, serverNetId);
      const createKeySession = netSession.createSubsession('create-key');
      const tssSetupSession = netSession.createSubsession('tss-setup');
      [keyShare, tssSetup] = await Promise.all([
        this.#dkm.createKey({
          custodians,
          threshold: 2,
          networkSession: createKeySession,
        }),
        this.#tss.setup({
          signers: bindings,
          networkSession: tssSetupSession,
        }),
      ]);
    } finally {
      await netSession.disconnect();
    }

    const backupId = createBackupId(this.#rng);
    await storeKeyShareBackup({
      baseURL: this.#cloudURL,
      token,
      backupId,
      encryptedKeyShare: await this.#encryptKeyShare(keyShare),
    });

    this.#applyKeyState({
      keyShare,
      netCreds,
      serverNetId,
      backupId,
      tssSetup,
    });
  }

  async #setupImport(): Promise<void> {
    const token = await this.#getProfileToken({ twoFactor: true });
    const netCreds = await this.#networkManager.createIdentity();
    const serverNetId = await getNetId({
      baseURL: this.#cloudURL,
      token,
    });

    const loaded = await loadKeyShareBackup({
      baseURL: this.#cloudURL,
      token,
    });
    const keyShare = await this.#decryptKeyShare(loaded.encryptedKeyShare);

    await registerClient({
      baseURL: this.#cloudURL,
      token,
      clientNetId: netCreds.partyId,
    });

    this.#applyKeyState({
      keyShare,
      netCreds,
      serverNetId,
      backupId: loaded.backupId,
      tssSetup: null,
    });
  }

  async #signHash(address: Hex, hash: Uint8Array): Promise<Uint8Array> {
    return this.#serializeSign(async () => {
      const state = this.#assertState();
      const { keyShare, netCreds, serverNetId } = state;
      let { tssSetup } = state;

      const addr = this.#address();
      if (!equalAddresses(address, addr)) {
        throw new Error(`account ${address} not found`);
      }

      const token = await this.#getProfileToken({
        twoFactor: true,
        challenge: hash,
      });
      const nonce = generateSessionNonce(this.#rng);
      await startSign({
        baseURL: this.#cloudURL,
        token,
        data: hash,
        clientNetId: netCreds.partyId,
        nonce,
      });

      const netSession = await this.#createNetworkSession(
        netCreds,
        serverNetId,
        nonce,
      );
      const bindings = shareBindings(netCreds.partyId, serverNetId);

      try {
        tssSetup = await this.#ensureTssSetup(
          netSession,
          serverNetId,
          bindings,
          tssSetup,
        );
        this.#applyKeyState({ ...state, tssSetup });

        try {
          const { signature } = await this.#tss.sign({
            key: keyShare,
            signers: bindings,
            message: hash,
            networkSession: netSession.createSubsession('tss-sign'),
            setup: tssSetup,
          });
          return toEthSig(signature, hash, keyShare.publicKey);
        } catch (error) {
          this.#applyKeyState({ ...state, tssSetup: null });
          throw error;
        }
      } finally {
        await netSession.disconnect();
      }
    });
  }

  async #ensureTssSetup(
    netSession: RootNetworkSession,
    peerNetId: PartyId,
    bindings: ShareBinding[],
    storedSetup: Uint8Array | null,
  ): Promise<Uint8Array> {
    const haveSetup = storedSetup !== null;
    netSession.sendMessage(
      peerNetId,
      TSS_HAVE_SETUP_MESSAGE_TYPE,
      new TextEncoder().encode(JSON.stringify({ haveSetup })),
    );
    const peerBytes = await netSession.receiveMessage(
      peerNetId,
      TSS_HAVE_SETUP_MESSAGE_TYPE,
    );
    const peerPayload = JSON.parse(new TextDecoder().decode(peerBytes)) as {
      haveSetup?: unknown;
    };
    const peerHaveSetup = peerPayload.haveSetup === true;
    if (haveSetup && peerHaveSetup) {
      return storedSetup;
    }

    return this.#tss.setup({
      signers: bindings,
      networkSession: netSession.createSubsession('tss-setup'),
    });
  }

  async #createNetworkSession(
    netCreds: MfaNetworkIdentity,
    serverNetId: PartyId,
    nonce: string,
  ): Promise<RootNetworkSession> {
    const sessionId = createScopedSessionId(
      [serverNetId, netCreds.partyId],
      nonce,
    );
    return this.#networkManager.createSession(netCreds, sessionId);
  }

  async #encryptKeyShare(keyShare: CL24ThresholdKey): Promise<Uint8Array> {
    const key = await this.#getBackupEncryptionKey();
    const plaintext = new TextEncoder().encode(
      JSON.stringify(this.#serializer.thresholdKey.toJson(keyShare)),
    );
    const iv = this.#rng.generateRandomBytes(AES_GCM_IV_LENGTH);
    return encryptBytes(key, plaintext, iv);
  }

  async #decryptKeyShare(
    encryptedKeyShare: Uint8Array,
  ): Promise<CL24ThresholdKey> {
    const key = await this.#getBackupEncryptionKey();
    const plaintext = await decryptBytes(key, encryptedKeyShare);
    return this.#serializer.thresholdKey.fromJson(
      JSON.parse(new TextDecoder().decode(plaintext)) as Json,
    );
  }

  async #serializeSign<Result>(
    operation: () => Promise<Result>,
  ): Promise<Result> {
    const previous = this.#signQueue;
    let release!: () => void;
    this.#signQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  #parseSetupParams(
    state: Record<string, Json>,
  ): MPCKeyringSetupParams | undefined {
    if (!('mode' in state)) {
      return undefined;
    }
    const { mode } = state;
    if (mode === 'create' || mode === 'import') {
      return { mode };
    }
    throw new Error("Invalid setup mode: expected 'create' or 'import'");
  }

  #applyKeyState(state: MPCKeyringState): void {
    this.#state = {
      status: 'initialized',
      ...state,
    };
  }

  #assertState(): MPCKeyringState {
    if (!this.#state || this.#state.status !== 'initialized') {
      throw new Error('Keyring not initialized');
    }
    return this.#state;
  }

  #address(): Hex {
    return publicKeyToAddressHex(this.#assertState().keyShare.publicKey);
  }
}
