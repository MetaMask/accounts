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
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import { Dkls19TssLib } from '@metamask/mfa-wallet-dkls19-lib';
import type {
  RandomNumberGenerator,
  ThresholdKey,
} from '@metamask/mfa-wallet-interface';
import type { WasmLib as Dkls19WasmLib } from '@metamask/tss-dkls19-lib';
import { bytesToHex, hexToBytes, type Hex, type Json } from '@metamask/utils';

import { initCloudKeyGen, initCloudSign } from './cloud';
import type { NetworkIdentity, NetworkManager } from './network';
import { generateSessionId } from './network';
import type {
  InitRole,
  MPCKeyringOpts,
  MPCKeyringSerializer,
  ThresholdKeyId,
} from './types';
import {
  equalAddresses,
  getSignedTypedDataHash,
  parseEthSig,
  parseInitRole,
  parseSignedTypedDataVersion,
  parseThresholdKeyId,
  publicToAddressHex,
  toEthSig,
} from './util';

const mpcKeyringType = 'MPC Keyring';

export class MPCKeyring implements Keyring {
  readonly type: string = mpcKeyringType;

  readonly #rng: RandomNumberGenerator;

  readonly #networkManager: NetworkManager;

  readonly #dkls19Lib: Dkls19WasmLib;

  #initRole: InitRole;

  #networkIdentity?: NetworkIdentity;

  #keyShare?: ThresholdKey;

  #keyId?: ThresholdKeyId;

  readonly #cloudURL: string;

  readonly #serializer: MPCKeyringSerializer;

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
    this.#dkls19Lib = opts.dkls19Lib;
    this.#networkManager = opts.networkManager;
    this.#cloudURL = opts.cloudURL;
    this.#serializer = opts.serializer;
    this.#initRole = opts.initRole;
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<Json> {
    const state: Json = {
      initRole: this.#initRole,
    };
    if (this.#networkIdentity) {
      state.networkIdentity = this.#serializer.networkIdentityToJSON(
        this.#networkIdentity,
      );
    }
    if (this.#keyShare) {
      state.keyShare = this.#serializer.thresholdKeyToJSON(this.#keyShare);
    }
    if (this.#keyId) {
      state.keyId = this.#keyId;
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

    if ('initRole' in state) {
      this.#initRole = parseInitRole(state.initRole);
    }

    if ('networkIdentity' in state) {
      this.#networkIdentity = this.#serializer.networkIdentityFromJSON(
        state.networkIdentity,
      );
    }

    if ('keyShare' in state) {
      this.#keyShare = this.#serializer.thresholdKeyFromJSON(state.keyShare);
    }

    if ('keyId' in state) {
      this.#keyId = parseThresholdKeyId(state.keyId);
    }
  }

  async init(): Promise<void> {
    const dkm = new CL24DKM('secp256k1', secp256k1Curve, this.#rng);

    const net = this.#networkManager;
    const networkIdentity = await net.createIdentity();
    const localId = networkIdentity.partyId;
    const sessionId = generateSessionId(this.#rng);
    const { cloudId } = await initCloudKeyGen({
      localId,
      sessionId,
      baseURL: this.#cloudURL,
    });
    const custodians = [localId, cloudId];
    const threshold = 2;

    const networkSession = await net.createSession(
      networkIdentity,
      custodians,
      sessionId,
    );

    this.#networkIdentity = networkIdentity;
    this.#keyShare = await dkm.createKey({
      custodians,
      threshold,
      networkSession,
    });
    this.#keyId = networkSession.sessionId;
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

    const addr = publicToAddressHex(this.#keyShare.publicKey);
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
    }

    const { custodians, publicKey } = this.#keyShare;

    const addr = publicToAddressHex(publicKey);
    if (!equalAddresses(address, addr)) {
      throw new Error(`account ${address} not found`);
    }

    const sessionId = generateSessionId(this.#rng);
    const message = hash;

    await initCloudSign({
      keyId: this.#keyId,
      sessionId,
      message,
      baseURL: this.#cloudURL,
    });

    const networkSession = await this.#networkManager.createSession(
      this.#networkIdentity,
      custodians,
      sessionId,
    );

    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng, true);
    const { signature } = await dkls19.sign({
      key: this.#keyShare,
      signers: custodians,
      message,
      networkSession,
    });

    // NOTE: We could create an Ethereum compliant signature more efficiently if
    // the signing library provided the parity bit.
    return toEthSig(signature, hash, publicKey);
  }
}
