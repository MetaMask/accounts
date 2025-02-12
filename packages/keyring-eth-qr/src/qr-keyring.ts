import { CryptoAccount, CryptoHDKey } from '@keystonehq/bc-ur-registry-eth';
import { URRegistryDecoder } from '@keystonehq/ur-decoder';
import type { Hex, Keyring } from '@metamask/utils';
import { UR } from '@ngraveio/bc-ur';
import { AccountDeriver } from './account-deriver';

export const QR_KEYRING_TYPE = 'QrKeyring' as const;

export const SUPPORTED_UR_TYPE = {
  CRYPTO_HDKEY: 'crypto-hdkey',
  CRYPTO_ACCOUNT: 'crypto-account',
  ETH_SIGNATURE: 'eth-signature',
};

/**
 * The state of the QrKeyring
 *
 * @property accounts - The accounts in the QrKeyring
 */
export type QrKeyringState = {
  accounts: Record<number, Hex>;
  cbor?: Hex;
};

export class QrKeyring implements Keyring<QrKeyringState> {
  type = QR_KEYRING_TYPE;

  #accounts: Record<number, Hex> = {};

  #deriver: AccountDeriver = new AccountDeriver();

  async serialize(): Promise<QrKeyringState> {
    return {
      accounts: Object.values(this.#accounts),
      cbor: '', // TODO: Serialize deriver
    };
  }

  async deserialize(state: QrKeyringState): Promise<void> {
    this.#accounts = state.accounts;
    if (state.cbor) {
      this.submitCBOR(state.cbor);
    }
  }

  async addAccounts(_accountsToAdd: number): Promise<Hex[]> {
    // TODO: Implement
  }

  async getAccounts(): Promise<Hex[]> {
    return Object.values(this.#accounts);
  }

  submitCBOR(cbor: Hex) {
    const ur = URRegistryDecoder.decode(cbor);
    const bufferedCbor = Buffer.from(cbor, 'hex');
    let derivationSource: CryptoHDKey | CryptoAccount;

    switch (ur.type) {
      case SUPPORTED_UR_TYPE.CRYPTO_HDKEY:
        derivationSource = CryptoHDKey.fromCBOR(bufferedCbor);
        break;
      case SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT:
        derivationSource = CryptoAccount.fromCBOR(bufferedCbor);
        break;
      default:
        throw new Error('Unsupported UR type');
    }

    this.#deriver.init(derivationSource);
  }

  async setAccountToUnlock(index: number): Promise<void> {
    // TODO: Implement
  }
}
