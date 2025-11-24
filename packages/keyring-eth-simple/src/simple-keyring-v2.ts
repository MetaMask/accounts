import type { TypedTransaction } from '@ethereumjs/tx';
import type {
  MessageTypes,
  TypedDataV1,
  TypedMessage,
} from '@metamask/eth-sig-util';
import { SignTypedDataVersion } from '@metamask/eth-sig-util';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  type ExportAccountOptions,
  type ExportedAccount,
  type KeyringAccount,
  type KeyringCapabilities,
  type KeyringRequest,
  KeyringType,
  type KeyringV2,
  KeyringWrapper,
  PrivateKeyEncoding,
} from '@metamask/keyring-api';
import type { AccountId } from '@metamask/keyring-utils';
import type { Hex, Json } from '@metamask/utils';

// eslint-disable-next-line @typescript-eslint/naming-convention
import type SimpleKeyring from './simple-keyring';

const simpleKeyringV2Capabilities: KeyringCapabilities = {
  scopes: [EthScope.Eoa],
};

const SIMPLE_KEYRING_EOA_METHODS = [
  EthMethod.SignTransaction,
  EthMethod.Sign,
  EthMethod.PersonalSign,
  EthMethod.SignTypedDataV1,
  EthMethod.SignTypedDataV3,
  EthMethod.SignTypedDataV4,
];

export type SimpleKeyringV2Options = {
  legacyKeyring: SimpleKeyring;
  entropySourceId: string;
};

export class SimpleKeyringV2
  extends KeyringWrapper<SimpleKeyring>
  implements KeyringV2
{
  readonly #accountsCache = new Map<Hex, KeyringAccount>();

  constructor(options: SimpleKeyringV2Options) {
    super({
      type: KeyringType.PrivateKey,
      inner: options.legacyKeyring,
      capabilities: simpleKeyringV2Capabilities,
      entropySourceId: options.entropySourceId,
    });
  }

  #toHexAddress(address: string): Hex {
    return address as Hex;
  }

  #createKeyringAccount(address: Hex): KeyringAccount {
    const id = this.resolver.register(address);

    const account: KeyringAccount = {
      id,
      type: EthAccountType.Eoa,
      address,
      scopes: this.capabilities.scopes,
      methods: SIMPLE_KEYRING_EOA_METHODS,
      options: {},
    };

    this.#accountsCache.set(address, account);

    return account;
  }

  async getAccounts(): Promise<KeyringAccount[]> {
    const addresses = await this.inner.getAccounts();

    return addresses.map((address) => {
      const cached = this.#accountsCache.get(address);
      if (cached) {
        return cached;
      }

      return this.#createKeyringAccount(address);
    });
  }

  async deserialize(state: Json): Promise<void> {
    this.#accountsCache.clear();

    await this.inner.deserialize(state as string[]);

    await this.getAccounts();
  }

  async createAccounts(): Promise<KeyringAccount[]> {
    const [address] = await this.inner.addAccounts(1);

    if (!address) {
      throw new Error('Failed to create simple keyring account');
    }

    const hexAddress = this.#toHexAddress(address);
    const account = this.#createKeyringAccount(hexAddress);

    return [account];
  }

  async deleteAccount(accountId: AccountId): Promise<void> {
    await this.getAccounts();

    const account = await this.getAccount(accountId);
    const hexAddress = this.#toHexAddress(account.address);

    this.inner.removeAccount(hexAddress);

    this.#accountsCache.delete(hexAddress);
  }

  async exportAccount(
    accountId: AccountId,
    options?: ExportAccountOptions,
  ): Promise<ExportedAccount> {
    const account = await this.getAccount(accountId);

    const requestedEncoding =
      options?.encoding ?? PrivateKeyEncoding.Hexadecimal;

    if (requestedEncoding !== PrivateKeyEncoding.Hexadecimal) {
      throw new Error(
        `Unsupported encoding for Simple keyring: ${requestedEncoding}. Only '${PrivateKeyEncoding.Hexadecimal}' is supported.`,
      );
    }

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
        return this.inner.signPersonalMessage(hexAddress, data as Hex);
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

      default:
        throw new Error(`Unsupported method for SimpleKeyringV2: ${method}`);
    }
  }
}
