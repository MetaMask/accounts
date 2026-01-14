import { TransactionFactory, type TypedTransaction } from '@ethereumjs/tx';
import type { Keyring } from '@metamask/keyring-utils';
import {
  CL24DKM,
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import { DklsTssLib } from '@metamask/mfa-wallet-dkls19-lib';
import type {
  RandomNumberGenerator,
  ThresholdKey,
} from '@metamask/mfa-wallet-interface';
import { load as loadDkls19 } from '@metamask/tss-dkls19-lib';
import type { Hex, Json } from '@metamask/utils';

import {
  createNetworkIdentity,
  createNetworkSession,
  generateSessionId,
} from './network';
import type { MPCKeyringOpts, ThresholdKeyId } from './types';
import { equalAddresses, publicToAddressHex } from './util';

const type = 'eth-mpc';

export class MPCKeyring implements Keyring {
  readonly type: string = type;

  readonly #rng: RandomNumberGenerator;

  #dklsLib?: DklsTssLib;

  #initRole: 'initiator' | 'responder' = 'initiator';

  #networkCredentials: NetworkCredentials;

  #keyShare?: ThresholdKey;

  readonly #keyId?: ThresholdKeyId;

  constructor(opts: MPCKeyringOpts) {
    this.#rng = {
      generateRandomBytes: opts.getRandomBytes,
    };
  }

  /**
   * Return the serialized state of the keyring.
   *
   * @returns The serialized state of the keyring.
   */
  async serialize(): Promise<Json> {
    return {
      initRole: this.#initRole,
      networkCredentials: serializeNetworkCredentials(this.#networkCredentials),
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
      this.#networkCredentials = deserializeNetworkCredentials(
        state.networkCredentials,
      );
    }

    if ('keyShare' in state) {
      this.#keyShare = deserializeThresholdKey(state.keyShare);
    }
  }

  async init(): Promise<void> {
    this.#dklsLib = await loadDkls19();

    const dkm = new CL24DKM('secp256k1', secp256k1Curve, this.#rng);

    const networkCredentials = await createNetworkIdentity();
    const localId = networkCredentials.partyId;
    const sessionId = generateSessionId();
    const { cloudId } = await initCloudKeyGen({
      localId,
    });
    const custodians = [localId, cloudId];
    const threshold = 2;

    const networkSession = await createNetworkSession(
      networkCredentials,
      custodians,
      sessionId,
    );

    this.#networkCredentials = networkCredentials;
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
    } else if (!this.#networkCredentials) {
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

    const networkSession = await createNetworkSession(
      this.#networkCredentials,
      custodians,
      sessionId,
    );

    const dkls19 = new DklsTssLib(this.#dklsLib, this.#rng);
    const signature = await dkls19.sign({
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

  /**
   * Sign an EIP-7702 authorization using the specified account.
   * This method is compatible with the EIP-7702 standard for enabling smart contract code for EOAs.
   *
   * @param withAccount - The address of the account.
   * @param authorization - The EIP-7702 authorization to sign.
   * @param opts - The options for signing the authorization.
   * @returns The signature of the authorization.
   */
  async signEip7702Authorization(
    withAccount: Hex,
    authorization: [chainId: number, contractAddress: Hex, nonce: number],
    opts?: Record<string, unknown>,
  ): Promise<string> {}

  /**
   * Remove an account from the keyring.
   *
   * @param account - The address of the account to remove.
   */
  removeAccount(account: Hex): void {}
}
