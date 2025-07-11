import { toAccountGroupId, toDefaultAccountGroupId } from './group';
import { AccountWalletCategory, toAccountWalletId } from './wallet';

describe('toAccountGroupId', () => {
  it('converts a account wallet id and a unique id to a group id', () => {
    const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
    const groupId = toAccountGroupId(walletId, 'test');

    expect(groupId.startsWith(walletId)).toBe(true);
  });
});

describe('toDefaultAccountGroupId', () => {
  it('converts a account wallet id and to the default group id', () => {
    const walletId = toAccountWalletId(AccountWalletCategory.Keyring, 'test');
    const groupId = toDefaultAccountGroupId(walletId);

    expect(groupId.startsWith(walletId)).toBe(true);
  });
});
