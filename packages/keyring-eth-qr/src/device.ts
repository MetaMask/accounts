import { RLP } from '@ethereumjs/rlp';
import {
  type TypedTransaction,
  TransactionType,
  type TypedTxData,
  TransactionFactory,
} from '@ethereumjs/tx';
import { publicToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  CryptoHDKey,
  DataType,
  ETHSignature,
  EthSignRequest,
  URRegistryDecoder,
} from '@keystonehq/bc-ur-registry-eth';
import type { MessageTypes, TypedMessage } from '@metamask/eth-sig-util';
import { add0x, getChecksumAddress, remove0x, type Hex } from '@metamask/utils';
// eslint-disable-next-line @typescript-eslint/naming-convention
import HdKey from 'hdkey';
import { stringify, v4 as uuidv4 } from 'uuid';

import {
  QrScanRequestType,
  type QrKeyringBridge,
  type QrSignatureRequest,
  type SerializedUR,
} from './qr-keyring';

export const SUPPORTED_UR_TYPE = {
  CRYPTO_HDKEY: 'crypto-hdkey',
  CRYPTO_ACCOUNT: 'crypto-account',
  ETH_SIGNATURE: 'eth-signature',
};

export enum DeviceMode {
  HD = 'hd',
  ACCOUNT = 'account',
}

const DEFAULT_CHILDREN_PATH = '0/*';

const MAX_INDEX = 1_000;

/**
 * Common details for the device source, which can be either a CryptoAccount or CryptoHDKey.
 */
export type CommonDeviceDetails = {
  /**
   * Value take out from the device note field, if available.
   */
  keyringAccount: string;
  /**
   * The name of the device
   */
  name: string;
  /**
   * The device fingerprint, hex-encoded
   */
  xfp: string;
  /**
   * Indexes of the accounts derived from the device
   * in the form of a map from address to index
   */
  indexes: Record<Hex, number>;
};

/**
 * Details for the HD mode of the Device. This mode derives
 * accounts from a root public key (xpub) and a derivation path.
 */
export type HDModeDeviceDetails = {
  /**
   * The device mode is HD, indicating that it derives accounts from a
   * root public key (xpub) and a derivation path.
   */
  keyringMode: DeviceMode.HD;
  /**
   * The xpub of the HD key
   */
  xpub: string;
  /**
   * The derivation path of the HD key
   */
  hdPath: string;
  /**
   * The path used to derive child accounts
   */
  childrenPath: string;
};

/**
 * Details for the Account mode of the Device. This mode derives
 * accounts from a set of addresses and their corresponding paths.
 */
export type AccountModeDeviceDetails = {
  /**
   * The device mode is ACCOUNT, indicating that it derives accounts from
   * a set of addresses and their corresponding paths.
   */
  keyringMode: DeviceMode.ACCOUNT;
  /**
   * The derivation paths for each hex-encoded address in the device
   */
  paths: Record<Hex, string>;
};

/**
 * An address with its corresponding index.
 */
export type IndexedAddress = {
  address: Hex;
  index: number;
};

/**
 * The details of the source CryptoAccount or CryptoHDKey
 * that the Device uses to derive accounts.
 */
export type DeviceDetails = CommonDeviceDetails &
  (HDModeDeviceDetails | AccountModeDeviceDetails);

export type DeviceOptions = {
  /**
   * The requestScan function to scan the QR code
   */
  requestScan: QrKeyringBridge['requestScan'];
  /**
   * The source of the device, which can be of type `DeviceDetails`,
   * `string`, or `SerializedUR`.
   *
   * When a `string` or `SerializedUR` is provided, the Device will
   * initialize itself from the UR.
   */
  source: DeviceDetails | string | SerializedUR;
};

/**
 * Get the fingerprint of the source CryptoAccount or CryptoHDKey
 *
 * @param source - The source CryptoAccount or CryptoHDKey
 * @returns The fingerprint of the source
 */
function getFingerprintFromSource(source: CryptoAccount | CryptoHDKey): string {
  return source instanceof CryptoAccount
    ? source.getMasterFingerprint()?.toString('hex')
    : source.getParentFingerprint()?.toString('hex');
}

/**
 * Get fingerprint, account paths and names from the a CryptoAccount
 *
 * Note: This function emulates the behavior of the `@keystonehq/base-eth-keyring`
 * library when dealing with CryptoAccount objects (for backwards compatibility
 * reasons). Though, the way it retrieves `name` and `keyringAccount` is questionable,
 * as `name` and `keyringAccount` are updated after each descriptor discovery, effectively
 * returning the last descriptor's `name` and `keyringAccount`.
 *
 * @param source - The source CryptoAccount
 * @returns The paths
 */
function readCryptoAccountOutputDescriptors(source: CryptoAccount): {
  xfp: string;
  paths: Record<Hex, string>;
  name: string;
  keyringAccount: string;
} {
  const descriptors = source.getOutputDescriptors();

  if (!descriptors || descriptors.length === 0) {
    throw new Error('No output descriptors found in CryptoAccount');
  }

  let name = '';
  let keyringAccount = '';
  const paths = descriptors.reduce(
    (descriptorsPaths: Record<Hex, string>, current) => {
      const hdKey = current.getHDKey();
      if (hdKey) {
        const path = `M/${hdKey.getOrigin().getPath()}`;
        const address = getChecksumAddress(
          add0x(
            Buffer.from(publicToAddress(hdKey.getKey(), true)).toString('hex'),
          ),
        );
        descriptorsPaths[address] = path;
        name = hdKey.getName();
        keyringAccount = hdKey.getNote();
      }
      return descriptorsPaths;
    },
    {},
  );

  return {
    paths,
    name,
    keyringAccount,
    xfp: getFingerprintFromSource(source),
  };
}

export class Device {
  readonly #requestScan: QrKeyringBridge['requestScan'];

  readonly #pairedDevice: DeviceDetails;

  /**
   * Create a new Device instance.
   *
   * @param options - The options for the Device, including the requestScan function
   * and the source of the device details.
   * @param options.requestScan - The function to request a scan of the QR code.
   * @param options.source - The source of the device details, which can be a
   * UR string, a `SerializedUR`, or a `DeviceDetails` object.
   */
  constructor({ requestScan, source }: DeviceOptions) {
    this.#requestScan = requestScan;
    this.#pairedDevice =
      typeof source === 'string' || 'cbor' in source
        ? this.#deviceDetailsFromUR(source)
        : source;
  }

  /**
   * Derive an address from the source at a given index
   *
   * @param index - The index to derive the address from
   * @returns The derived address in hex format
   * @throws Will throw an error if the source is not initialized
   */
  addressFromIndex(index: number): Hex {
    if (this.#pairedDevice.keyringMode === DeviceMode.ACCOUNT) {
      const address = Object.keys(this.#pairedDevice.paths)[index];
      if (!address) {
        throw new Error(`Address not found for index ${index}`);
      }
      return add0x(address);
    }
    const childPath = `m/${this.#pairedDevice.childrenPath.replace(
      '*',
      index.toString(),
    )}`;

    const hdKey = HdKey.fromExtendedKey(this.#pairedDevice.xpub);
    const childKey = hdKey.derive(childPath);

    const address = Buffer.from(
      publicToAddress(childKey.publicKey, true),
    ).toString('hex');

    const normalizedAddress = getChecksumAddress(add0x(address));

    this.#pairedDevice.indexes[normalizedAddress] = index;

    return normalizedAddress;
  }

  /**
   * Retrieve the path of an address derived from the source.
   *
   * @param address - The address to retrieve the path for
   * @returns The path of the address
   */
  pathFromAddress(address: Hex): string {
    const normalizedAddress = getChecksumAddress(add0x(address));

    if (this.#pairedDevice.keyringMode === DeviceMode.ACCOUNT) {
      const path = this.#pairedDevice.paths[normalizedAddress];
      if (path === undefined) {
        throw new Error(`Unknown address ${normalizedAddress}`);
      }
      return path;
    }

    let index = this.#pairedDevice.indexes[normalizedAddress];
    if (index === undefined) {
      for (let i = 0; i < MAX_INDEX; i++) {
        const derivedAddress = this.addressFromIndex(i);
        if (derivedAddress === normalizedAddress) {
          index = i;
          break;
        }
      }
      if (index === undefined) {
        throw new Error(`Unknown address ${normalizedAddress}`);
      }
    }

    return `${this.#pairedDevice.hdPath}/${this.#pairedDevice.childrenPath
      .replace('*', index.toString())
      .replace(/\*/gu, '0')}`;
  }

  /**
   * Get a page of addresses derived from the source.
   *
   * @param page - The page number to retrieve
   * @param pageSize - The number of addresses per page
   * @returns An array of IndexedAddress objects, each containing the address and its index
   * @throws Will throw an error if the source is not initialized
   */
  getAddressesPage(page: number, pageSize = 5): IndexedAddress[] {
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const addresses: IndexedAddress[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      const address = this.addressFromIndex(i);
      addresses.push({ address, index: i });
    }

    return addresses;
  }

  /**
   * Retrieve the details of the paired device.
   *
   * @returns Thea paired device details
   */
  getDeviceDetails(): DeviceDetails {
    return this.#pairedDevice;
  }

  /**
   * Sign a transaction. This is equivalent to the `eth_signTransaction`
   * Ethereum JSON-RPC method. See the Ethereum JSON-RPC API documentation for
   * more details.
   *
   * @param address - The address of the account to use for signing.
   * @param transaction - The transaction to sign.
   * @returns The signed transaction.
   */
  async signTransaction(
    address: Hex,
    transaction: TypedTransaction,
  ): Promise<TypedTxData> {
    const dataType =
      transaction.type === TransactionType.Legacy
        ? DataType.transaction
        : DataType.typedTransaction;

    const messageToSign = transaction.getMessageToSign();
    const rawTransaction = Buffer.from(
      Array.isArray(messageToSign) ? RLP.encode(messageToSign) : messageToSign,
    );

    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      rawTransaction,
      dataType,
      this.pathFromAddress(address),
      this.#pairedDevice.xfp,
      requestId,
      Number(transaction.common.chainId()),
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
      requestTitle: 'Scan with your hardware wallet',
      requestDescription:
        'After your device has signed this message, click on "Scan" to receive the signature',
    });

    return TransactionFactory.fromTxData(
      {
        ...transaction.toJSON(),
        r,
        s,
        v,
      },
      {
        common: transaction.common,
      },
    );
  }

  /**
   * Sign a message. This is equivalent to the `eth_signTypedData` v4 Ethereum
   * JSON-RPC method.
   *
   * @param address - The address of the account to use for signing.
   * @param data - The data to sign.
   * @returns The signed message.
   */
  async signTypedData<Types extends MessageTypes>(
    address: Hex,
    data: TypedMessage<Types>,
  ): Promise<string> {
    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      Buffer.from(JSON.stringify(data), 'utf8'),
      DataType.typedData,
      this.pathFromAddress(address),
      this.#pairedDevice.xfp,
      requestId,
      undefined,
      address,
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
    });

    return add0x(
      Buffer.concat([
        Uint8Array.from(r),
        Uint8Array.from(s),
        Uint8Array.from(v),
      ]).toString('hex'),
    );
  }

  /**
   * Sign a message. This is equivalent to the `eth_sign` Ethereum JSON-RPC
   * method, which is exposed by MetaMask as the method `personal_sign`. See
   * the Ethereum JSON-RPC API documentation for more details.
   *
   * For more information about this method and why we call it `personal_sign`,
   * see the {@link https://docs.metamask.io/guide/signing-data.html|MetaMask Docs}.
   *
   * @param address - The address of the account to use for signing.
   * @param message - The message to sign.
   * @returns The signed message.
   */
  async signPersonalMessage(address: Hex, message: Hex): Promise<string> {
    const requestId = uuidv4();
    const ethSignRequestUR = EthSignRequest.constructETHRequest(
      Buffer.from(remove0x(message), 'hex'),
      DataType.personalMessage,
      this.pathFromAddress(address),
      this.#pairedDevice.xfp,
      requestId,
      undefined,
      address,
    ).toUR();

    const { r, s, v } = await this.#requestSignature({
      requestId,
      payload: {
        type: ethSignRequestUR.type,
        cbor: ethSignRequestUR.cbor.toString('hex'),
      },
    });

    return add0x(
      Buffer.concat([
        Uint8Array.from(r),
        Uint8Array.from(s),
        Uint8Array.from(v),
      ]).toString('hex'),
    );
  }

  /**
   * Derive the device details from a UR string
   *
   * @param ur - The UR string to set the root account from
   * @returns The device details derived from the UR
   */
  #deviceDetailsFromUR(ur: string | SerializedUR): DeviceDetails {
    const source = this.#decodeUR(ur);
    const fingerprint = getFingerprintFromSource(source);

    if (source instanceof CryptoAccount) {
      const { name, xfp, paths, keyringAccount } =
        readCryptoAccountOutputDescriptors(source);
      return {
        keyringMode: DeviceMode.ACCOUNT,
        keyringAccount,
        name,
        xfp,
        paths,
        indexes: {},
      };
    }

    const { getBip32Key, getOrigin, getChildren, getName, getNote } = source;
    return {
      keyringMode: DeviceMode.HD,
      keyringAccount: getNote(),
      name: getName(),
      xfp: fingerprint,
      hdPath: `m/${getOrigin().getPath()}`,
      childrenPath: getChildren()?.getPath() || DEFAULT_CHILDREN_PATH,
      xpub: getBip32Key(),
      indexes: {},
    };
  }

  /**
   * Request a signature for a transaction or message.
   *
   * @param request - The signature request containing the data to sign.
   * @returns The signature as an object containing r, s, and v values.
   */
  async #requestSignature(
    request: QrSignatureRequest,
  ): Promise<{ r: Buffer; s: Buffer; v: Buffer }> {
    const response = await this.#requestScan({
      type: QrScanRequestType.SIGN,
      request,
    });
    const signatureEnvelope = ETHSignature.fromCBOR(
      Buffer.from(response.cbor, 'hex'),
    );
    const signature = signatureEnvelope.getSignature();
    const requestId = signatureEnvelope.getRequestId();

    if (!requestId) {
      throw new Error('Signature request ID is missing.');
    }

    if (request.requestId !== stringify(requestId)) {
      throw new Error(
        `Signature request ID mismatch. Expected: ${
          request.requestId
        }, received: ${requestId.toString('hex')}`,
      );
    }

    return {
      r: signature.subarray(0, 32),
      s: signature.subarray(32, 64),
      v: signature.subarray(64),
    };
  }

  /**
   * Decodes a UR
   *
   * @param ur - The UR to decode
   * @returns The decoded CryptoAccount or CryptoHDKey
   * @throws Will throw an error if the UR type is not supported
   */
  #decodeUR(ur: string | SerializedUR): CryptoAccount | CryptoHDKey {
    const decodedUR =
      typeof ur === 'string'
        ? URRegistryDecoder.decode(ur)
        : {
            type: ur.type,
            cbor: Buffer.from(ur.cbor, 'hex'),
          };

    const { type, cbor } = decodedUR;

    switch (type) {
      case SUPPORTED_UR_TYPE.CRYPTO_HDKEY:
        return CryptoHDKey.fromCBOR(cbor);
      case SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT:
        return CryptoAccount.fromCBOR(cbor);
      default:
        throw new Error('Unsupported UR type');
    }
  }
}
