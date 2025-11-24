import type { TypedTransaction } from '@ethereumjs/tx';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
  type KeyringAccount,
  type KeyringCapabilities,
  type KeyringRequest,
  KeyringType,
  type KeyringV2,
  KeyringWrapper,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

import type { QrKeyring, SerializedQrKeyringState } from './qr-keyring';

const qrKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
};

/**
 * Methods supported by QR keyring EOA accounts.
 * QR keyrings support signing transactions, typed data v4, and personal messages.
 */
const QR_KEYRING_EOA_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV4,
];

export type QrKeyringV2Options = {
  legacyKeyring: QrKeyring;
  entropySourceId: string;
};

export class QrKeyringV2
  extends KeyringWrapper<QrKeyring>
  implements KeyringV2
{
  /**
   * In-memory cache of KeyringAccount objects.
   * Maps address (as Hex) to KeyringAccount.
   */
  readonly #accountsCache = new Map<Hex, KeyringAccount>();

  constructor(options: QrKeyringV2Options) {
    super({
      type: KeyringType.Qr,
      inner: options.legacyKeyring,
      capabilities: qrKeyringV2Capabilities,
      entropySourceId: options.entropySourceId,
    });
  }

  /**
   * Helper method to safely cast a KeyringAccount address to Hex type.
   * The KeyringAccount.address is typed as string, but for Ethereum accounts
   * it should always be a valid Hex address.
   *
   * @param address - The address from a KeyringAccount.
   * @returns The address as Hex type.
   */
  #toHexAddress(address: string): Hex {
    return address as Hex;
  }

  /**
   * Creates a KeyringAccount object for the given address.
   *
   * @param address - The account address.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(address: Hex): KeyringAccount {
    const id = this.resolver.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: this.capabilities.scopes,
      methods: QR_KEYRING_EOA_METHODS,
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.PrivateKey,
        },
      },
    };

    // Cache the account
    this.#accountsCache.set(address, account);

    return account;
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address) => {
      // Check if we already have this account cached
      const cached = this.#accountsCache.get(address);
      if (cached) {
        return cached;
      }

      // Create and cache the account if not already cached
      return this.#createKeyringAccount(address);
    });
  }

  async deserialize(state: Json): Promise<void> {
    // Clear the cache when deserializing
    this.#accountsCache.clear();

    // Deserialize the legacy keyring
    await this.inner.deserialize(state as SerializedQrKeyringState);

    // Rebuild the cache by populating it with all accounts
    // We call getAccounts() which will repopulate the cache as a side effect
    await this.getAccounts();
  }

  async createAccounts(): Promise<KeyringAccount[]> {
    const [address] = await this.inner.addAccounts(1);

    if (!address) {
      throw new Error('Failed to create QR keyring account');
    }

    const hexAddress = this.#toHexAddress(address);
    const account = this.#createKeyringAccount(hexAddress);

    return [account];
  }

  async deleteAccount(accountId: AccountId): Promise<void> {
    // Sync with the inner keyring state in case it was modified externally
    // This ensures our cache is up-to-date before we make changes
    await this.getAccounts();

    const account = await this.getAccount(accountId);
    const hexAddress = this.#toHexAddress(account.address);

    // Remove from the legacy keyring
    this.inner.removeAccount(hexAddress);

    // Remove from our cache
    this.#accountsCache.delete(hexAddress);
  }

  async submitRequest(request: KeyringRequest): Promise<Json> {
    const { method, params = [] } = request.request;

    const { address } = await this.getAccount(request.account);
    const hexAddress = this.#toHexAddress(address);

    // Validate params is an array
    if (!Array.isArray(params)) {
      throw new Error('Expected params to be an array');
    }

    switch (method) {
      case `${EthMethod.SignTransaction}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for eth_signTransaction');
        }
        const [tx] = params;
        return this.inner.signTransaction(
          hexAddress,
          tx as unknown as TypedTransaction,
        ) as unknown as Json;
      }

      case `${EthMethod.PersonalSign}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for personal_sign');
        }
        const [data] = params;
        return this.inner.signPersonalMessage(hexAddress, data as Hex);
      }

      case `${EthMethod.SignTypedDataV4}`: {
        if (params.length < 2) {
          throw new Error(`Invalid params for ${method}`);
        }
        const [, data] = params;

        return this.inner.signTypedData(
          hexAddress,
          data as unknown as TypedMessage<MessageTypes>,
        );
      }

      default:
        throw new Error(`Unsupported method for QrKeyringV2: ${method}`);
    }
  }
}
