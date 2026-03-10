import {
  HdKeyring,
  type DeserializableHDKeyringState,
} from '@metamask/eth-hd-keyring';
import { Hex } from '@metamask/utils';

// Based on the coin type created in [this PR](https://github.com/satoshilabs/slips/pull/1983)
export const CASH_ACCOUNT_DERIVATION_PATH = `m/44'/4392018'/0'/0`;
const type = 'Cash Account Keyring';

export class CashAccountKeyring extends HdKeyring {
  static override type: string = type;

  override type: string = type;

  override hdPath: string = CASH_ACCOUNT_DERIVATION_PATH;

  // This override is required because the deserialize method in the
  // CashAccountKeyring falls back to it's own static value if no
  // option is provided.
  override async deserialize(
    opts: Partial<DeserializableHDKeyringState>,
  ): Promise<void> {
    return super.deserialize({
      ...opts,
      hdPath: opts.hdPath ?? CASH_ACCOUNT_DERIVATION_PATH,
    });
  }

  // This override ensures that we can only ever add a
  // single account to this keyring
  override async addAccounts(): Promise<Hex[]> {
    return super.addAccounts(1);
  }
}
