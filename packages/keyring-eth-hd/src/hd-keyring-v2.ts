import type { TypedTransaction } from '@ethereumjs/tx';
import type {
  EIP7702Authorization,
  EthEncryptedData,
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
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

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
  entropySourceId: string;
};

export class HdKeyringV2
  extends KeyringWrapper<HdKeyring>
  implements KeyringV2
{
  constructor(options: HdKeyringV2Options) {
    super({
      type: KeyringType.Hd,
      inner: options.legacyKeyring,
      capabilities: hdKeyringV2Capabilities,
      entropySourceId: options.entropySourceId,
    });
  }

  #isLastAccount(accountId: AccountId): boolean {
    const accountIds = this.registry.keys();
    return accountIds[accountIds.length - 1] === accountId;
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
   * Creates a KeyringAccount object for the given address and index.
   *
   * @param address - The account address.
   * @param addressIndex - The account index in the HD path.
   * @returns The created KeyringAccount.
   */
  #createKeyringAccount(address: Hex, addressIndex: number): KeyringAccount {
    const id = this.registry.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: this.capabilities.scopes,
      methods: HD_KEYRING_EOA_METHODS,
      options: {
        entropy: {
          derivationPath: `${this.inner.hdPath}/${addressIndex}`,
          groupIndex: addressIndex,
          id: this.entropySourceId,
          type: KeyringAccountEntropyTypeOption.Mnemonic,
        },
      },
    };

    // Add the account to the registry
    this.registry.set(account);

    return account;
  }

  async getAccounts(): Promise<KeyringAccount[]> {
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
  ): Promise<KeyringAccount[]> {
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

    // Cannot create accounts at indices lower than current count
    if (targetIndex < currentCount) {
      throw new Error(
        `Cannot create account at group index ${targetIndex}: ` +
          `index is below current account count ${currentCount}.`,
      );
    }

    // Add accounts up to and including the target index
    const accountsToAdd = targetIndex - currentCount + 1;
    const newAddresses = await this.inner.addAccounts(accountsToAdd);

    // Create and cache KeyringAccount objects for all newly added accounts
    const newAccounts: KeyringAccount[] = newAddresses.map((address, index) => {
      const groupIndex = currentCount + index;
      return this.#createKeyringAccount(address, groupIndex);
    });

    return newAccounts;
  }

  /**
   * Delete an account from the keyring.
   *
   * ⚠️ Warning: Only deleting the last account is possible.
   *
   * @param accountId - The account ID to delete.
   */
  async deleteAccount(accountId: AccountId): Promise<void> {
    // Sync with the inner keyring state in case it was modified externally
    // This ensures our registry is up-to-date before we make changes
    await this.getAccounts();
    const keyringAccount = await this.getAccount(accountId);
    const hexAddress = this.#toHexAddress(keyringAccount.address);

    // Assert that the account to delete is the last one
    if (!this.#isLastAccount(accountId)) {
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
    const privateKeyHex = await this.inner.exportAccount(
      this.#toHexAddress(account.address),
    );

    const exported: ExportedAccount = {
      type: 'private-key',
      privateKey: `0x${privateKeyHex}`,
      encoding: PrivateKeyEncoding.Hexadecimal,
    };

    return exported;
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

      case `${EthMethod.Sign}`: {
        if (params.length < 2) {
          throw new Error('Invalid params for eth_sign');
        }
        const [, data] = params;
        return this.inner.signMessage(hexAddress, data as string);
      }

      case `${EthMethod.PersonalSign}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for personal_sign');
        }
        const [data] = params;
        return this.inner.signPersonalMessage(hexAddress, data as string);
      }

      case `${EthMethod.SignTypedDataV1}`:
      case `${EthMethod.SignTypedDataV3}`:
      case `${EthMethod.SignTypedDataV4}`: {
        if (params.length < 2) {
          throw new Error(`Invalid params for ${method}`);
        }
        const [, data] = params;
        let version: SignTypedDataVersion;
        if (method === EthMethod.SignTypedDataV4) {
          version = SignTypedDataVersion.V4;
        } else if (method === EthMethod.SignTypedDataV3) {
          version = SignTypedDataVersion.V3;
        } else {
          version = SignTypedDataVersion.V1;
        }

        return this.inner.signTypedData(
          hexAddress,
          data as unknown as TypedDataV1 | TypedMessage<MessageTypes>,
          {
            version,
          },
        );
      }

      case `${HdKeyringEthMethod.Decrypt}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for eth_decrypt');
        }
        const [encryptedData] = params;
        return this.inner.decryptMessage(
          hexAddress,
          encryptedData as unknown as EthEncryptedData,
        );
      }

      case `${HdKeyringEthMethod.GetEncryptionPublicKey}`: {
        return this.inner.getEncryptionPublicKey(hexAddress);
      }

      case `${HdKeyringEthMethod.GetAppKeyAddress}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for eth_getAppKeyAddress');
        }
        const [origin] = params;
        return this.inner.getAppKeyAddress(hexAddress, origin as string);
      }

      case `${HdKeyringEthMethod.SignEip7702Authorization}`: {
        if (params.length < 1) {
          throw new Error('Invalid params for eth_signEip7702Authorization');
        }
        const [authorization] = params;
        return this.inner.signEip7702Authorization(
          hexAddress,
          authorization as unknown as EIP7702Authorization,
        );
      }

      default:
        throw new Error(`Unsupported method for HdKeyringWrapper: ${method}`);
    }
  }
}
