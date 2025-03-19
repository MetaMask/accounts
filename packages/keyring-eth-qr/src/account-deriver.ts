import { pubToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  CryptoHDKey,
  URRegistryDecoder,
  type CryptoOutput,
} from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';
import HDKey from 'hdkey';

export const SUPPORTED_UR_TYPE = {
  CRYPTO_HDKEY: 'crypto-hdkey',
  CRYPTO_ACCOUNT: 'crypto-account',
  ETH_SIGNATURE: 'eth-signature',
};

export type RootAccount = { fingerprint: Hex } & (
  | {
      type: 'hd';
      hdPath: string;
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
      this.#root = {
        fingerprint,
        type: 'hd',
        hdPath: `m/${source.getOrigin().getPath()}`,
        childrenPath: source.getChildren().getPath(),
        bip32xPub: source.getBip32Key(),
      };
    }
  }

  deriveIndex(index: number): Hex {
    if (!this.#root) {
      throw new Error('AccountDeriver not initialized');
    }

    if (this.#root.type === 'account') {
      const address = Object.keys(this.#root.addressPaths)[index];
      if (!address) {
        throw new Error(`Address not found for index ${index}`);
      }
      return add0x(address);
    } else {
      const hdKey = HDKey.fromExtendedKey(this.#root.bip32xPub);
      const derived = hdKey.derive(`m/${index}`);
      const address = getChecksumAddress(
        add0x(
          Buffer.from(pubToAddress(derived.publicKey, true)).toString('hex'),
        ),
      );
      return add0x(address);
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
            Buffer.from(pubToAddress(hdKey.getKey(), true)).toString('hex'),
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
    const decodedUR = URRegistryDecoder.decode(ur);
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
