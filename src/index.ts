/* eslint-disable id-denylist */
import { HandlerType } from '@metamask/snaps-utils';
import { Json } from '@metamask/utils';
import { ethErrors } from 'eth-rpc-errors';
import { v4 as uuidv4 } from 'uuid';

import { SnapKeyringErrors } from './errors';

import { DeferredPromise } from './util';

export const SNAP_KEYRING_TYPE = 'Snap Keyring';

export type SnapId = string; // Origin of the snap
export type Address = string; // String public address
export type PublicKey = Uint8Array; // 33 or 64 byte public key
export type JsonWallet = [PublicKey, Json];
export type SnapWallet = Map<Address, SnapId>;

// TODO: import from snap rpc
enum ManageAccountsOperation {
  ListAccounts = 'list',
  CreateAccount = 'create',
  ReadAccount = 'read',
  UpdateAccount = 'update',
  RemoveAccount = 'remove',
}

type JsonRpcRequest = {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
};

// Type for serialized format.
export type SerializedWallets = {
  [key: string]: string;
};

class SnapKeyring {
  static type: string = SNAP_KEYRING_TYPE;

  type: string;

  protected addressToSnapId: SnapWallet;

  protected snapController: any;

  protected pendingRequests: Map<string, DeferredPromise<any>>;

  constructor() {
    this.type = SnapKeyring.type;
    this.addressToSnapId = new Map();
    this.pendingRequests = new Map();
  }

  // keyrings cant take constructor arguments so we
  // late-set the provider
  setController(snapController: any): void {
    this.snapController = snapController;
  }

  /**
   * Send a RPC request to a snap.
   *
   * @param snapId - Snap ID.
   * @param request - JSON-RPC request.
   * @param origin - Request's origin.
   * @param handler - Request handler.
   * @returns The RPC response.
   */
  protected async sendRequestToSnap(
    snapId: SnapId,
    request: Json,
    origin = 'metamask',
    handler = HandlerType.OnRpcRequest,
  ): Promise<any> {
    return this.snapController.handleRequest({
      snapId,
      origin,
      handler,
      request,
    });
  }

  protected async sendSignatureRequestToSnap(
    snapId: SnapId,
    request: any,
  ): Promise<any> {
    console.log('sendSignatureRequest', snapId, request);
    const resp = this.sendRequestToSnap(snapId, {
      jsonrpc: '2.0',
      method: 'snap_keyring_sign_request',
      params: request,
    });
    console.log('sendSignatureRequest returned');

    try {
      const result = await resp;
      console.log('sendSignatureRequest resolved', result);
      return result;
    } catch (err) {
      console.log('sendSignatureRequest error', err);
      throw err;
    }
  }

  async handleKeyringSnapMessage(
    snapId: SnapId,
    message: any,
    // eslint-disable-next-line @typescript-eslint/ban-types
    saveSnapKeyring: Function,
  ): Promise<any> {
    const [methodName, params] = message;

    switch (methodName) {
      case 'create': {
        const address = params as Address;
        this.createAccount(snapId, address);
        await saveSnapKeyring();
        return null;
      }

      case 'read': {
        const accounts = this.listAccounts(snapId);
        return accounts;
      }

      // case 'update': {
      // }

      case 'delete': {
        const address = params as Address;
        if (!address) {
          throw new Error('Missing account address');
        }

        const deleted = this.deleteAccount(address);
        if (deleted) {
          await saveSnapKeyring(address);
        }
        return deleted;
      }

      case 'submit': {
        const { id, result } = params;
        console.log('submit', id, result);
        this.submitSignatureRequestResult(id, result);
        return true;
      }

      default:
        throw ethErrors.rpc.invalidParams({
          message: 'Must specify a valid snap_manageAccounts "methodName".',
        });
    }
  }

  /**
   * Convert the wallets in this keyring to a serialized form
   * suitable for persistence.
   *
   * This function is synchronous but uses an async signature
   * for consistency with other keyring implementations.
   */
  async serialize(): Promise<SerializedWallets> {
    const output: SerializedWallets = {};
    for (const [address, origin] of this.addressToSnapId.entries()) {
      output[address] = origin;
    }
    return output;
  }

  /**
   * Deserialize the given wallets into this keyring.
   *
   * This function is synchronous but uses an async signature
   * for consistency with other keyring implementations.
   *
   * @param wallets - Serialize wallets.
   */
  async deserialize(wallets: SerializedWallets): Promise<void> {
    if (!wallets || Object.keys(wallets).length === 0) {
      throw new Error(SnapKeyringErrors.MissingWallet);
    }
    for (const [address, origin] of Object.entries(wallets)) {
      this.addressToSnapId.set(address, origin);
    }
  }

  /**
   * Get an array of public addresses.
   */
  async getAccounts(): Promise<Address[]> {
    return Array.from(this.addressToSnapId.keys());
  }

  /**
   * Sign a transaction.
   *
   * @param address - Sender's address.
   * @param tx - Transaction.
   * @param _opts - Transaction options (not used).
   */
  async signTransaction(address: Address, tx: any, _opts = {}) {
    const snapId = this.addressToSnapId.get(address);
    if (snapId === undefined) {
      throw new Error(`No snap found for address "${address}"`);
    }

    // Forward request to snap
    const id = uuidv4();
    const txParams = tx.toJSON();
    await this.sendSignatureRequestToSnap(snapId, {
      id,
      method: 'eth_sendTransaction',
      params: [txParams],
    });
    const signingPromise = new DeferredPromise<any>();
    this.pendingRequests.set(id, signingPromise);
    console.log('new pending request', id);

    // wait for signing to complete
    const sigHexString = (await signingPromise.promise) as unknown as string;
    const { v, r, s } = signatureHexStringToRsv(sigHexString);
    console.log('signTransaction', sigHexString);
    return tx._processSignature(v, r, s);
  }

  /**
   * Sign a message.
   *
   * @param _address - Signer's address.
   * @param _data - Data to sign.
   * @param _opts - Signing options.
   */
  async signMessage(_address: Address, _data: any, _opts = {}) {
    throw new Error('death to eth_sign!');
  }

  /**
   * Sign a personal message.
   *
   * Note: KeyringController says this should return a Buffer but it actually
   * expects a string.
   *
   * @param address - Signer's address.
   * @param data - Data to sign.
   * @param _opts - Unused options.
   * @returns Promise of the signature.
   */
  async signPersonalMessage(
    address: Address,
    data: any,
    _opts = {},
  ): Promise<string> {
    const origin = this.addressToSnapId.get(address);
    if (origin === undefined) {
      throw new Error(`No origin found for address "${address}"`);
    }

    // forward to snap
    const id = uuidv4();
    await this.sendSignatureRequestToSnap(origin, {
      id,
      method: 'personal_sign',
      params: [data, address],
    });

    const signingPromise = new DeferredPromise<any>();
    console.log('new pending request', id);
    this.pendingRequests.set(id, signingPromise);

    // wait for signing to complete
    const sigHexString = (await signingPromise.promise) as unknown as string;
    console.log('signPersonalMessage', sigHexString);
    return sigHexString;
  }

  /**
   * Gets the private data associated with the given address so
   * that it may be exported.
   *
   * If this keyring contains duplicate public keys the first
   * matching address is exported.
   *
   * Used by the UI to export an account.
   *
   * @param _address - Address of the account to export.
   */
  exportAccount(_address: Address): [PublicKey, Json] | undefined {
    throw new Error('snap-keyring: "exportAccount" not supported');
  }

  /**
   * Removes the first account matching the given public address.
   *
   * @param _address - Address of the account to remove.
   */
  async removeAccount(_address: Address): Promise<boolean> {
    const snapId = this.addressToSnapId.get(_address);
    if (!snapId) {
      throw new Error(SnapKeyringErrors.UnknownAccount);
    }

    await this.sendRequestToSnap(snapId, {
      request: ManageAccountsOperation.RemoveAccount,
      params: {},
    });
    this.addressToSnapId.delete(_address);

    return true;
  }

  /* SNAP RPC METHODS */

  /**
   * List the accounts for a snap origin.
   *
   * @param targetOrigin - Snap origin.
   * @returns List of addresses for the given origin.
   */
  listAccounts(targetOrigin: SnapId): Address[] {
    return Array.from(this.addressToSnapId.entries())
      .filter(([_, origin]) => {
        return origin === targetOrigin;
      })
      .map(([address, _]) => {
        return address;
      });
  }

  /**
   * Create an account for a snap origin.
   *
   * The account is only created if the public address does not already exist.
   *
   * This checks for duplicates in the context of the snap origin but not
   * across all snaps. The keyring controller is responsible for checking for
   * duplicates across all addresses.
   *
   * @param origin - Origin.
   * @param address - Address.
   */
  createAccount(origin: SnapId, address: string): void {
    if (this.addressToSnapId.has(address)) {
      throw new Error(SnapKeyringErrors.AccountAlreadyExists);
    }
    this.addressToSnapId.set(address, origin);
  }

  /**
   * Delete the private data for an account belonging to a snap origin.
   *
   * @param address - Address to remove.
   * @returns True if the address existed before, false otherwise.
   */
  deleteAccount(address: string): boolean {
    return this.addressToSnapId.delete(address);
  }

  deleteAccountsByOrigin(origin: SnapId): void {
    const addressByOrigin = this.listAccounts(origin);
    if (addressByOrigin.length === 0) {
      throw new Error(SnapKeyringErrors.UnknownSnapId);
    }

    for (const address of addressByOrigin) {
      this.addressToSnapId.delete(address);
    }
  }

  submitSignatureRequestResult(id: string, result: any): void {
    const signingPromise = this.pendingRequests.get(id);
    if (signingPromise?.resolve === undefined) {
      console.warn(
        'submitSignatureRequestResult missing requested id',
        id,
        result,
      );
      return;
    }
    this.pendingRequests.delete(id);
    signingPromise.resolve(result);
  }
}

export default SnapKeyring;

/**
 * Parses a hex signature into RSV.
 *
 * @param signatureHexString - Signature in hex.
 * @returns The signature as an {r,s,v} object.
 */
function signatureHexStringToRsv(signatureHexString: string): {
  r: string;
  s: string;
  v: number;
} {
  // eslint-disable-next-line id-length
  const r = signatureHexString.slice(0, 66);
  // eslint-disable-next-line id-length
  const s = `0x${signatureHexString.slice(66, 130)}`;
  // eslint-disable-next-line id-length
  const v = parseInt(signatureHexString.slice(130, 132), 16);
  return { r, s, v };
}
