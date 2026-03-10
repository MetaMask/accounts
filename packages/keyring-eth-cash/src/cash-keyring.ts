import {
  HdKeyring,
  type DeserializableHDKeyringState,
} from '@metamask/eth-hd-keyring';
import type { Hex } from '@metamask/utils';

// Based on the coin type created in [this PR](https://github.com/satoshilabs/slips/pull/1983)
export const CASH_DERIVATION_PATH = `m/44'/4392018'/0'/0`;
const type = 'Cash Keyring';

export class CashKeyring extends HdKeyring {
  static override type: string = type;

  override readonly type: string = type;

  override readonly hdPath: string = CASH_DERIVATION_PATH;

  // This override is required because the deserialize method in the
  // CashKeyring falls back to it's own static value if no
  // option is provided.
  override async deserialize(
    opts: Partial<
      Omit<DeserializableHDKeyringState, 'hdPath' | 'numberOfAccounts'>
    >,
  ): Promise<void> {
    return super.deserialize({
      ...opts,
      numberOfAccounts: 1,
      hdPath: CASH_DERIVATION_PATH,
    });
  }

  override async addAccounts(): Promise<Hex[]> {
    const existing = await this.getAccounts();
    if (existing.length > 0) {
      throw new Error('Cash keyring already has an account');
    }
    return super.addAccounts(1);
  }
}
