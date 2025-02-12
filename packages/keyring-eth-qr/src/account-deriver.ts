import { pubToAddress } from '@ethereumjs/util';
import {
  CryptoAccount,
  type CryptoHDKey,
  type CryptoOutput,
} from '@keystonehq/bc-ur-registry-eth';
import { add0x, getChecksumAddress, type Hex } from '@metamask/utils';
import HDKey from 'hdkey';

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

  init(source: CryptoAccount | CryptoHDKey) {
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
      hdKey.derive(`m/${index}`);
      const address = getChecksumAddress(
        add0x(Buffer.from(pubToAddress(hdKey.publicKey, true)).toString('hex')),
      );
      return add0x(address);
    }
  }

  #getFingerprintFromSource(source: CryptoAccount | CryptoHDKey): Hex {
    return source instanceof CryptoAccount
      ? add0x(source.getMasterFingerprint().toString('hex'))
      : add0x(source.getOrigin().getSourceFingerprint().toString('hex'));
  }

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
}
