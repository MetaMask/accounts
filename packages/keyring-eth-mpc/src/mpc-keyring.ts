import { TransactionFactory, type TypedTransaction } from '@ethereumjs/tx';
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
import type { Hex, Json } from '@metamask/utils';

import { initCloudKeyGen, initCloudSign } from './cloud';
import type { NetworkIdentity, NetworkManager } from './network';
import { generateSessionId } from './network';
import type { MPCKeyringOpts, ThresholdKeyId } from './types';
import {
  equalAddresses,
  parseEcdsaSignature,
  publicToAddressHex,
} from './util';

const type = 'eth-mpc';

export class MPCKeyring implements Keyring {
  readonly type: string = type;

  readonly #rng: RandomNumberGenerator;

  readonly #networkManager: NetworkManager;

  readonly #dkls19Lib: Dkls19WasmLib;

  #initRole: 'initiator' | 'responder' = 'initiator';

  #networkIdentity?: NetworkIdentity;

  #keyShare?: ThresholdKey;

  readonly #keyId?: ThresholdKeyId;

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
    this.#dkls19Lib = opts.dkls19Lib;
    this.#networkManager = {} as NetworkManager; // TODO
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<Json> {
    return {
      initRole: this.#initRole,
      networkCredentials: serializeNetworkCredentials(this.#networkIdentity),
      keyShare: serializeThresholdKey(this.#keyShare),
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

    if ('initRole' in state && state.initRole === 'responder') {
      this.#initRole = 'responder';
    }

    if ('networkCredentials' in state) {
      this.#networkIdentity = deserializeNetworkCredentials(
        state.networkCredentials,
      );
    }

    if ('keyShare' in state) {
      this.#keyShare = deserializeThresholdKey(state.keyShare);
    }
  }

  async init(): Promise<void> {
    const dkm = new CL24DKM('secp256k1', secp256k1Curve, this.#rng);

    const net = this.#networkManager;
    const networkIdentity = await net.createIdentity();
    const localId = networkIdentity.partyId;
    const sessionId = generateSessionId();
    const { cloudId } = await initCloudKeyGen({
      localId,
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

    const sessionId = generateSessionId();
    const message = tx.getHashedMessageToSign();

    await initCloudSign({
      keyId: this.#keyId,
      sessionId,
      message,
    });

    const networkSession = await this.#networkManager.createSession(
      this.#networkIdentity,
      custodians,
      sessionId,
    );

    const dkls19 = new Dkls19TssLib(this.#dkls19Lib, this.#rng);
    const { signature } = await dkls19.sign({
      key: this.#keyShare,
      signers: custodians,
      message,
      networkSession,
    });

    const { r, s, v } = parseEcdsaSignature(signature);

    return TransactionFactory.fromTxData({
      ...tx,
      r,
      s,
      v,
    });
  }

  /**
   * Sign a personal message using the specified account.
   * This method is compatible with the `personal_sign` RPC method.
   *
   * @param address - The address of the account.
   * @param msgHex - The message to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signPersonalMessage(
    address: Hex,
    msgHex: string,
    opts?: Record<string, unknown>,
  ): Promise<string> {}

  /**
   * Sign a typed message using the specified account.
   * This method is compatible with the `eth_signTypedData` RPC method.
   *
   * @param address - The address of the account.
   * @param data - The typed data to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signTypedData(
    address: Hex,
    data: unknown[] | Record<string, unknown>,
    opts?: Record<string, unknown>,
  ): Promise<string> {}
}
