import { publicToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  CryptoHDKey,
  URRegistryDecoder,
  type CryptoOutput,
} from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';
import { UR } from '@ngraveio/bc-ur';
import HDKey from 'hdkey';

export const SUPPORTED_UR_TYPE = {
  CRYPTO_HDKEY: 'crypto-hdkey',
  CRYPTO_ACCOUNT: 'crypto-account',
  ETH_SIGNATURE: 'eth-signature',
};

const DEFAULT_CHILDREN_PATH = '0/*';

export type RootAccount = { fingerprint: Hex } & (
  | {
      type: 'hd';
      hdPath: string;
      hdKey: HDKey;
      childrenPath: string;
      bip32xPub: string;
    }
  | {
      type: 'account';
      addressPaths: Record<Hex, string>;
    }
);

export class AccountDeriver {
  #root?: RootAccount;

  #ur: string | null = null;

  #cbor: Buffer | null = null;

  /**
   * Initializes the AccountDeriver with a UR
   *
   * @param ur - The UR to initialize the AccountDeriver with
   * @throws Will throw an error if the UR is not supported
   */
  init(ur: string): void {
    const source = this.#decodeUR(ur);
    const fingerprint = this.#getFingerprintFromSource(source);
    if (source instanceof CryptoAccount) {
      this.#root = {
        fingerprint,
        type: 'account',
        addressPaths: this.#getPathsFromCryptoOutputDescriptors(
          source.getOutputDescriptors(),
        ),
      };
    } else {
      const bip32xPub = source.getBip32Key();
      const hdPath = `m/${source.getOrigin().getPath()}`;
      const hdKey = HDKey.fromExtendedKey(bip32xPub);
      const childrenPath =
        source.getChildren()?.getPath() || DEFAULT_CHILDREN_PATH;

      this.#root = {
        fingerprint,
        type: 'hd',
        hdPath,
        hdKey,
        childrenPath,
        bip32xPub,
      };
    }
  }

  deriveIndex(index: number): Hex {
    if (!this.#root) {
      throw new Error('UR not initialized');
    }

    if (this.#root.type === 'account') {
      const address = Object.keys(this.#root.addressPaths)[index];
      if (!address) {
        throw new Error(`Address not found for index ${index}`);
      }
      return add0x(address);
    } else {
      const resolvedPath = this.#root.childrenPath.replace(
        '*',
        index.toString(),
      );

      const childPath = resolvedPath.startsWith('m/')
        ? resolvedPath
        : `m/${resolvedPath}`;

      const hdKey = HDKey.fromExtendedKey(this.#root.bip32xPub);
      const childKey = hdKey.derive(childPath);

      const address = add0x(
        Buffer.from(publicToAddress(childKey.publicKey, true)).toString('hex'),
      );
      return getChecksumAddress(address);
    }
  }

  /**
   * Gets the CBOR encoded UR, if available
   *
   * @returns The CBOR encoded UR
   */
  getUR(): string | null {
    return this.#ur;
  }

  /**
   * Gets the fingerprint of the source CryptoAccount or CryptoHDKey
   *
   * @param source - The source CryptoAccount or CryptoHDKey
   * @returns The fingerprint of the source
   */
  #getFingerprintFromSource(source: CryptoAccount | CryptoHDKey): Hex {
    return add0x(
      source instanceof CryptoAccount
        ? source.getMasterFingerprint()?.toString('hex')
        : source.getParentFingerprint()?.toString('hex'),
    );
  }

  /**
   * Gets the paths from the CryptoOutputDescriptors
   *
   * @param descriptors - The CryptoOutputDescriptors
   * @returns The paths
   */
  #getPathsFromCryptoOutputDescriptors(
    descriptors: CryptoOutput[],
  ): Record<Hex, string> {
    return descriptors.reduce((paths: Record<Hex, string>, current) => {
      const hdKey = current.getHDKey();
      if (hdKey) {
        const path = `M/${hdKey.getOrigin().getPath()}`;
        const address = getChecksumAddress(
          add0x(
            Buffer.from(publicToAddress(hdKey.getKey(), true)).toString('hex'),
          ),
        );
        paths[address] = path;
      }
      return paths;
    }, {});
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

    this.#ur = ur;
    this.#cbor = decodedUR.cbor;

    switch (decodedUR.type) {
      case SUPPORTED_UR_TYPE.CRYPTO_HDKEY:
        return CryptoHDKey.fromCBOR(this.#cbor);
      case SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT:
        return CryptoAccount.fromCBOR(this.#cbor);
      default:
        throw new Error('Unsupported UR type');
    }
  }
}
