import { TransactionFactory, type TypedTxData } from '@ethereumjs/tx';
import type { Bip44Account } from '@metamask/account-api';
import type {
  EIP7702Authorization,
  MessageTypes,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  type CreateAccountOptions,
  EthAccountType,
  EthMethod,
  EthScope,
  type ExportAccountOptions,
  type ExportedAccount,
  type KeyringAccount,
  KeyringAccountEntropyTypeOption,
  type KeyringCapabilities,
  type KeyringRequest,
  KeyringType,
  type KeyringV2,
  KeyringWrapper,
  PrivateKeyEncoding,
  EthDecryptParamsStruct,
  EthGetAppKeyAddressParamsStruct,
  EthPersonalSignParamsStruct,
  EthSignEip7702AuthorizationParamsStruct,
  EthSignParamsStruct,
  EthSignTransactionParamsStruct,
  EthSignTypedDataParamsStruct,
  EthSignTypedDataV1ParamsStruct,
  type EntropySourceId,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import { assert } from '@metamask/superstruct';
import { add0x, type Hex, type Json } from '@metamask/utils';

import type { DeserializableHDKeyringState, HdKeyring } from './hd-keyring';

/**
 * Additional Ethereum methods supported by HD keyring that are not in the standard EthMethod enum.
 * These are primarily encryption and utility methods.
 */
enum HdKeyringEthMethod {
  Decrypt = 'eth_decrypt',
  GetEncryptionPublicKey = 'eth_getEncryptionPublicKey',
  GetAppKeyAddress = 'eth_getAppKeyAddress',
  SignEip7702Authorization = 'eth_signEip7702Authorization',
}

const hdKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
  bip44: {
    deriveIndex: true,
    derivePath: false,
    discover: false,
  },
};

/**
 * Methods supported by HD keyring EOA accounts.
 * Combines standard Ethereum methods with HD keyring-specific methods.
 */
const HD_KEYRING_EOA_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.Sign,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
  HdKeyringEthMethod.Decrypt,
  HdKeyringEthMethod.GetEncryptionPublicKey,
  HdKeyringEthMethod.GetAppKeyAddress,
  HdKeyringEthMethod.SignEip7702Authorization,
];

/**
 * Concrete {@link KeyringV2} adapter for {@link HdKeyring}.
 *
 * This wrapper exposes the accounts and signing capabilities of the legacy
 * HD keyring via the unified V2 interface.
 */
export type HdKeyringV2Options = {
  legacyKeyring: HdKeyring;
  entropySourceId: EntropySourceId;
};

export class HdKeyringV2
  extends KeyringWrapper<HdKeyring, Bip44Account<KeyringAccount>>
  implements KeyringV2
{
  protected readonly entropySourceId: EntropySourceId;

  constructor(options: HdKeyringV2Options) {
    super({
      type: KeyringType.Hd,
      inner: options.legacyKeyring,
      capabilities: hdKeyringV2Capabilities,
    });
    this.entropySourceId = options.entropySourceId;
  }

  /**
   * Checks if the given address is the last account in the inner keyring.
   * This compares against the actual inner keyring state, not the registry,
   * to avoid issues with stale registry entries.
   *
   * @param address - The address to check.
   * @returns True if this is the last account in the inner keyring.
   */
  async #isLastAccount(address: string): Promise<boolean> {
    const innerAddresses = await this.inner.getAccounts();
    const lastAddress = innerAddresses[innerAddresses.length - 1];
    return address === lastAddress;
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
    return add0x(address);
  }

  /**
   * Creates a KeyringAccount object for the given address and index.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the HD path.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(
    address: Hex,
    addressIndex: number,
  ): Bip44Account<KeyringAccount> {
    const id = this.registry.register(address);

    const account: Bip44Account<KeyringAccount> = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: [...this.capabilities.scopes],
      methods: [...HD_KEYRING_EOA_METHODS],
      options: {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          id: this.entropySourceId,
          groupIndex: addressIndex,
          derivationPath: `${this.inner.hdPath}/${addressIndex}`,
        },
      },
    };

    // Add the account to the registry
    this.registry.set(account);

    return account;
  }

  async getAccounts(): Promise<Bip44Account<KeyringAccount>[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address, addressIndex) => {
      // Check if we already have this account in the registry
      const existingId = this.registry.getAccountId(address);
      if (existingId) {
        const cached = this.registry.get(existingId);
        if (cached) {
          return cached;
        }
      }

      // Create and register the account if not already cached
      return this.#createKeyringAccount(address, addressIndex);
    });
  }

  async deserialize(state: Json): Promise<void> {
    // Clear the registry when deserializing
    this.registry.clear();

    // Deserialize the legacy keyring
    await this.inner.deserialize(
      state as Partial<DeserializableHDKeyringState>,
    );

    // Rebuild the registry by populating it with all accounts
    // We call getAccounts() which will repopulate the registry as a side effect
    await this.getAccounts();
  }

  async createAccounts(
    options: CreateAccountOptions,
  ): Promise<Bip44Account<KeyringAccount>[]> {
    // For HD keyring, we only support BIP-44 derive index
    if (options.type !== 'bip44:derive-index') {
      throw new Error(
        `Unsupported account creation type for HdKeyring: ${options.type}`,
      );
    }

    // Validate that the entropy source matches this keyring's entropy source
    if (options.entropySource !== this.entropySourceId) {
      throw new Error(
        `Entropy source mismatch: expected '${this.entropySourceId}', got '${options.entropySource}'`,
      );
    }

    // Sync with the inner keyring state in case it was modified externally
    // This ensures our cache is up-to-date before we make changes
    const currentAccounts = await this.getAccounts();
    const currentCount = currentAccounts.length;
    const targetIndex = options.groupIndex;

    // Check if an account at this index already exists
    // Since only the last account can be deleted, array position always equals groupIndex
    const existingAccount = currentAccounts[targetIndex];
    if (existingAccount) {
      return [existingAccount];
    }

    // Only allow derivation of the next account in sequence
    if (targetIndex !== currentCount) {
      throw new Error(
        `Can only create the next account in sequence. ` +
          `Expected groupIndex ${currentCount}, got ${targetIndex}.`,
      );
    }

    // Add the next account
    const [newAddress] = await this.inner.addAccounts(1);

    if (!newAddress) {
      throw new Error('Failed to create new account');
    }

    const newAccount = this.#createKeyringAccount(newAddress, targetIndex);

    return [newAccount];
  }

  /**
   * Delete an account from the keyring.
   *
   * ⚠️ Warning: Only deleting the last account is possible.
   *
   * @param accountId - The account ID to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    // Get the account first, before any registry operations
    const { address } = await this.getAccount(accountId);
    const hexAddress = this.#toHexAddress(address);

    // Assert that the account to delete is the last one in the inner keyring
    // We check against the inner keyring directly to avoid stale registry issues
    if (!(await this.#isLastAccount(address))) {
      throw new Error(
        'Can only delete the last account in the HD keyring due to derivation index constraints.',
      );
    }

    // Remove from the legacy keyring
    this.inner.removeAccount(hexAddress);

    // Remove from the registry
    this.registry.delete(accountId);
  }

  async exportAccount(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount> {
    const account = await this.getAccount(accountId);

    // Validate encoding - we only support hexadecimal for Ethereum keys
    const requestedEncoding =
      options?.encoding ?? PrivateKeyEncoding.Hexadecimal;

    if (requestedEncoding !== PrivateKeyEncoding.Hexadecimal) {
      throw new Error(
        `Unsupported encoding for Ethereum HD keyring: ${requestedEncoding}. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
      );
    }

    // The legacy HdKeyring returns a hex string without 0x prefix.
    const privateKeyWithout0x = await this.inner.exportAccount(
      this.#toHexAddress(account.address),
    );
    const privateKey = add0x(privateKeyWithout0x);

    const exported: ExportedAccount = {
      type: 'private-key',
      privateKey,
      encoding: PrivateKeyEncoding.Hexadecimal,
    };

    return exported;
  }

  async submitRequest(request: KeyringRequest): Promise<Json> {
    const { method, params = [] } = request.request;

    const { address, methods } = await this.getAccount(request.account);
    const hexAddress = this.#toHexAddress(address);

    // Validate account can handle the method
    if (!methods.includes(method)) {
      throw new Error(
        `Account ${request.account} cannot handle method: ${method}`,
      );
    }

    switch (method) {
      case `${EthMethod.SignTransaction}`: {
        assert(params, EthSignTransactionParamsStruct);
        const [txData] = params;
        // Convert validated transaction data to TypedTransaction
        const tx = TransactionFactory.fromTxData(txData as TypedTxData);
        return this.inner.signTransaction(hexAddress, tx) as unknown as Json;
      }

      case `${EthMethod.Sign}`: {
        assert(params, EthSignParamsStruct);
        const [, data] = params;
        return this.inner.signMessage(hexAddress, data);
      }

      case `${EthMethod.PersonalSign}`: {
        assert(params, EthPersonalSignParamsStruct);
        const [data] = params;
        return this.inner.signPersonalMessage(hexAddress, data);
      }

      case `${EthMethod.SignTypedDataV1}`: {
        assert(params, EthSignTypedDataV1ParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(hexAddress, data as TypedDataV1, {
          version: SignTypedDataVersion.V1,
        });
      }

      case `${EthMethod.SignTypedDataV3}`: {
        assert(params, EthSignTypedDataParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(
          hexAddress,
          data as TypedMessage<MessageTypes>,
          {
            version: SignTypedDataVersion.V3,
          },
        );
      }

      case `${EthMethod.SignTypedDataV4}`: {
        assert(params, EthSignTypedDataParamsStruct);
        const [, data] = params;
        return this.inner.signTypedData(
          hexAddress,
          data as TypedMessage<MessageTypes>,
          {
            version: SignTypedDataVersion.V4,
          },
        );
      }

      case `${HdKeyringEthMethod.Decrypt}`: {
        assert(params, EthDecryptParamsStruct);
        const [encryptedData] = params;
        return this.inner.decryptMessage(hexAddress, encryptedData);
      }

      case `${HdKeyringEthMethod.GetEncryptionPublicKey}`: {
        return this.inner.getEncryptionPublicKey(hexAddress);
      }

      case `${HdKeyringEthMethod.GetAppKeyAddress}`: {
        assert(params, EthGetAppKeyAddressParamsStruct);
        const [origin] = params;
        return this.inner.getAppKeyAddress(hexAddress, origin);
      }

      case `${HdKeyringEthMethod.SignEip7702Authorization}`: {
        assert(params, EthSignEip7702AuthorizationParamsStruct);
        const [authorization] = params;
        return this.inner.signEip7702Authorization(
          hexAddress,
          authorization as EIP7702Authorization,
        );
      }

      default:
        throw new Error(`Unsupported method for HdKeyringV2: ${method}`);
    }
  }
}
