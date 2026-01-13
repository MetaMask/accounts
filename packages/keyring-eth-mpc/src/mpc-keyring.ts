import type { TypedTransaction } from '@ethereumjs/tx';
import type { Keyring } from '@metamask/keyring-utils';
import {
  CL24DKM,
  secp256k1 as secp256k1Curve,
} from '@metamask/mfa-wallet-cl24-lib';
import type { Hex, Json } from '@metamask/utils';

import type { MPCKeyringOpts } from './types';
import { CreateKeyParams, ThresholdKey } from '@metamask/mfa-wallet-interface';

const type = 'eth-mpc';

export class MPCKeyring implements Keyring {
  readonly type: string = type;

  #initRole: 'initiator' | 'responder' = 'initiator';

  #networkCredentials: NetworkCredentials;

  #keyShare: ThresholdKey;

  readonly #getRandomBytes: (size: number) => Uint8Array;

  constructor(opts: MPCKeyringOpts) {
    this.#getRandomBytes = opts.getRandomBytes;
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
      this.#networkCredentials = deserializeNetworkCredentials(state.networkCredentials);
    }

    if ('keyShare' in state) {
      this.#keyShare = deserializeThresholdKey(state.keyShare);
    }
  }

  async init(): Promise<void> {
    const rng = {
      generateRandomBytes: this.#getRandomBytes,
    };
    const dkm = new CL24DKM('secp256k1', secp256k1Curve, rng);

    const networkCredentials = await createNetworkIdentity();
    const localId = networkCredentials.partyId;
    const { partyId: cloudId, sessionId } = await initCloudKeyGen({
      localId,
    });
    const custodians = [localId, cloudId];
    const threshold = 2;

    const networkSession = await initNetworkSession(custodians, sessionId);

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
  async addAccounts(numberOfAccounts = 1): Promise<Hex[]> {}

  /**
   * Get the addresses of all accounts in the keyring.
   *
   * @returns The addresses of all accounts in the keyring.
   */
  async getAccounts(): Promise<Hex[]> {}

  /**
   * Get the public address of the account for the given app key origin.
   *
   * @param address - The address of the account.
   * @param origin - The origin of the app requesting the account.
   * @returns The public address of the account.
   */
  async getAppKeyAddress(address: Hex, origin: string): Promise<Hex> {}

  /**
   * Sign a transaction using the specified account.
   *
   * @param address - The address of the account.
   * @param tx - The transaction to sign.
   * @param opts - The options for signing the transaction.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    tx: TypedTransaction,
    opts = {},
  ): Promise<TypedTransaction> {}

  /**
   * Sign a message using the specified account.
   *
   * @param address - The address of the account.
   * @param data - The data to sign.
   * @param opts - The options for signing the message.
   * @returns The signature of the message.
   */
  async signMessage(
    address: Hex,
    data: string,
    opts?: Record<string, unknown>,
  ): Promise<string> {}

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
