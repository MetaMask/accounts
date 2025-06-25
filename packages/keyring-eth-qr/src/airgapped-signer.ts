import { publicToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  CryptoHDKey,
  URRegistryDecoder,
} from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';
// eslint-disable-next-line @typescript-eslint/naming-convention
import HdKey from 'hdkey';

export const SUPPORTED_UR_TYPE = {
  CRYPTO_HDKEY: 'crypto-hdkey',
  CRYPTO_ACCOUNT: 'crypto-account',
  ETH_SIGNATURE: 'eth-signature',
};

export enum KeyringMode {
  HD = 'hd',
  ACCOUNT = 'account',
}

const DEFAULT_CHILDREN_PATH = '0/*';

const MAX_INDEX = 1_000;

/**
 * Common details for the signer source, which can be either a CryptoAccount or CryptoHDKey.
 */
export type CommonSignerDetails = {
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
 * Details for the HD mode of the AirgappedSigner. This mode derives
 * accounts from a root public key (xpub) and a derivation path.
 */
export type HDModeSignerDetails = {
  /**
   * The keyring mode is HD, indicating that it derives accounts from a
   * root public key (xpub) and a derivation path.
   */
  keyringMode: KeyringMode.HD;
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
 * Details for the Account mode of the AirgappedSigner. This mode derives
 * accounts from a set of addresses and their corresponding paths.
 */
export type AccountModeSignerDetails = {
  /**
   * The keyring mode is ACCOUNT, indicating that it derives accounts from
   * a set of addresses and their corresponding paths.
   */
  keyringMode: KeyringMode.ACCOUNT;
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
 * that the AirgappedSigner uses to derive accounts.
 */
export type AirgappedSignerDetails = CommonSignerDetails &
  (HDModeSignerDetails | AccountModeSignerDetails);

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

export class AirgappedSigner {
  #source?: AirgappedSignerDetails | undefined;

  /**
   * Initialize the AirgappedSigner with a source.
   *
   * @param source - The signer source, in the form of details object, or a UR string
   */
  init(source: AirgappedSignerDetails | string): void {
    if (typeof source === 'string') {
      this.#initFromUR(source);
    } else {
      this.#source = source;
    }
  }

  /**
   * Check if the AirgappedSigner is initialized
   *
   * @returns True if the AirgappedSigner is initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.#source !== undefined;
  }

  /**
   * Derive an address from the source at a given index
   *
   * @param index - The index to derive the address from
   * @returns The derived address in hex format
   * @throws Will throw an error if the source is not initialized
   */
  addressFromIndex(index: number): Hex {
    if (!this.#source) {
      throw new Error('UR not initialized');
    }

    if (this.#source.keyringMode === KeyringMode.ACCOUNT) {
      const address = Object.keys(this.#source.paths)[index];
      if (!address) {
        throw new Error(`Address not found for index ${index}`);
      }
      return add0x(address);
    }
    const childPath = `m/${this.#source.childrenPath.replace(
      '*',
      index.toString(),
    )}`;

    const hdKey = HdKey.fromExtendedKey(this.#source.xpub);
    const childKey = hdKey.derive(childPath);

    const address = Buffer.from(
      publicToAddress(childKey.publicKey, true),
    ).toString('hex');

    const normalizedAddress = getChecksumAddress(add0x(address));

    this.#source.indexes[normalizedAddress] = index;

    return normalizedAddress;
  }

  /**
   * Retrieve the index of an address from the source
   *
   * @param address - The normalized address to retrieve the index for
   * @returns The index of the address
   */
  indexFromAddress(address: Hex): number {
    if (!this.#source) {
      throw new Error('UR not initialized');
    }

    const cachedIndex = this.#source.indexes[address];
    if (cachedIndex !== undefined) {
      return Number(cachedIndex);
    }

    if (this.#source.keyringMode === KeyringMode.ACCOUNT) {
      const path = this.#source.paths[address];
      if (path === undefined) {
        throw new Error(`Unknown address`);
      }

      const index = path.split('/').pop();
      if (index === undefined) {
        throw new Error(`Invalid path for address ${address}`);
      }

      return Number(index);
    }

    for (let i = 0; i < MAX_INDEX; i++) {
      const derivedAddress = this.addressFromIndex(i);
      if (derivedAddress === address) {
        return i;
      }
    }

    throw new Error(`Address ${address} not found`);
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
   * Gets the source details of the AirgappedSigner.
   *
   * @returns The source details, or undefined if not initialized
   */
  getSourceDetails(): AirgappedSignerDetails | undefined {
    return this.#source;
  }

  /**
   * Clear the source details.
   */
  clear(): void {
    this.#source = undefined;
  }

  /**
   * Set the root account from a UR string
   *
   * @param ur - The UR string to set the root account from
   */
  #initFromUR(ur: string): void {
    const source = this.#decodeUR(ur);
    const fingerprint = getFingerprintFromSource(source);

    if (source instanceof CryptoAccount) {
      const { name, xfp, paths, keyringAccount } =
        readCryptoAccountOutputDescriptors(source);
      this.#source = {
        keyringMode: KeyringMode.ACCOUNT,
        keyringAccount,
        name,
        xfp,
        paths,
        indexes: {},
      };
    } else {
      const { getBip32Key, getOrigin, getChildren, getName, getNote } = source;
      this.#source = {
        keyringMode: KeyringMode.HD,
        keyringAccount: getNote(),
        name: getName(),
        xfp: fingerprint,
        hdPath: `m/${getOrigin().getPath()}`,
        childrenPath: getChildren()?.getPath() || DEFAULT_CHILDREN_PATH,
        xpub: getBip32Key(),
        indexes: {},
      };
    }
  }

  /**
   * Decodes a UR
   *
   * @param ur - The UR to decode
   * @returns The decoded CryptoAccount or CryptoHDKey
   * @throws Will throw an error if the UR type is not supported
   */
  #decodeUR(ur: string): CryptoAccount | CryptoHDKey {
    const decodedUR = URRegistryDecoder.decode(ur);

    const { cbor } = decodedUR;

    switch (decodedUR.type) {
      case SUPPORTED_UR_TYPE.CRYPTO_HDKEY:
        return CryptoHDKey.fromCBOR(cbor);
      case SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT:
        return CryptoAccount.fromCBOR(cbor);
      default:
        throw new Error('Unsupported UR type');
    }
  }
}
