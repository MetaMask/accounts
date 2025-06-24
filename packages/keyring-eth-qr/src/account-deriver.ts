import { publicToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  CryptoHDKey,
  URRegistryDecoder,
} from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';
import { UR } from '@ngraveio/bc-ur';
import HDKey from 'hdkey';

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

export type CommonSourceDetails = {
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
};

export type HDModeSourceDetails = {
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

export type AccountModeSourceDetails = {
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
 * The details of the source CryptoAccount or CryptoHDKey
 * that the AccountDeriver uses to derive accounts.
 */
export type AirgappedSourceDetails = CommonSourceDetails &
  (HDModeSourceDetails | AccountModeSourceDetails);

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

  let name = '',
    keyringAccount = '';
  const paths = descriptors.reduce((paths: Record<Hex, string>, current) => {
    const hdKey = current.getHDKey();
    if (hdKey) {
      const path = `M/${hdKey.getOrigin().getPath()}`;
      const address = getChecksumAddress(
        add0x(
          Buffer.from(publicToAddress(hdKey.getKey(), true)).toString('hex'),
        ),
      );
      paths[address] = path;
      name = hdKey.getName();
      keyringAccount = hdKey.getNote();
    }
    return paths;
  }, {});

  return {
    paths,
    name,
    keyringAccount,
    xfp: getFingerprintFromSource(source),
  };
}

export class AccountDeriver {
  #source?: AirgappedSourceDetails | undefined;

  /**
   * Initializes the AccountDeriver
   *
   * @param source - The source CryptoAccount or CryptoHDKey, or a UR string
   * @throws Will throw an error if the UR is not supported
   */
  init(source: AirgappedSourceDetails | string): void {
    if (typeof source === 'string') {
      this.#initFromUR(source);
    } else {
      this.#source = source;
    }
  }

  deriveIndex(index: number): Hex {
    if (!this.#source) {
      throw new Error('UR not initialized');
    }

    if (this.#source.keyringMode === KeyringMode.ACCOUNT) {
      const address = Object.keys(this.#source.paths)[index];
      if (!address) {
        throw new Error(`Address not found for index ${index}`);
      }
      return add0x(address);
    } else {
      const resolvedPath = this.#source.childrenPath.replace(
        '*',
        index.toString(),
      );

      const childPath = resolvedPath.startsWith('m/')
        ? resolvedPath
        : `m/${resolvedPath}`;

      const hdKey = HDKey.fromExtendedKey(this.#source.xpub);
      const childKey = hdKey.derive(childPath);

      const address = add0x(
        Buffer.from(publicToAddress(childKey.publicKey, true)).toString('hex'),
      );
      return getChecksumAddress(address);
    }
  }

  getSourceDetails(): AirgappedSourceDetails | undefined {
    return this.#source;
  }

  clear(): void {
    this.#source = undefined;
  }

  /**
   * Sets the root account from a UR string
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
    let decodedUR: UR;
    try {
      decodedUR = URRegistryDecoder.decode(ur);
    } catch (error) {
      throw new Error(`Invalid UR format`);
    }

    const cbor = decodedUR.cbor;

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
