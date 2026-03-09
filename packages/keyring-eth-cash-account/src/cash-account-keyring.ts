import {
  HdKeyring,
  type DeserializableHDKeyringState,
} from '@metamask/eth-hd-keyring';

const hdPathString = `m/44'/4392018'/0'/0`;
const type = 'Cash Account Keyring';

export class CashAccountKeyring extends HdKeyring {
  static override type: string = type;

  override type: string = type;

  override hdPath: string = hdPathString;

  // This override is required because the deserialize method in the cash-account-keyring falls back to it's own static value if no option is provided.
  override async deserialize(
    opts: Partial<DeserializableHDKeyringState>,
  ): Promise<void> {
    return super.deserialize({
      ...opts,
      hdPath: opts.hdPath ?? hdPathString,
    });
  }
}
