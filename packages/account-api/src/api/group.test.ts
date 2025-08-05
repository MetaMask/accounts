import { DEFAULT_ACCOUNT_GROUP_UNIQUE_ID, toAccountGroupId, toDefaultAccountGroupId } from './group';
import { AccountWalletType, toAccountWalletId } from './wallet';

describe('group', () => {
  describe('toAccountGroupId', () => {
    it('converts an account wallet id and a unique id to a group id', () => {
      const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
      const groupId = toAccountGroupId(walletId, 'test');

      expect(groupId.startsWith(walletId)).toBe(true);
      expect(groupId.endsWith('/test')).toBe(true);
    });
  });

  describe('toDefaultAccountGroupId', () => {
    it('converts an account wallet id and to the default group id', () => {
      const walletId = toAccountWalletId(AccountWalletType.Keyring, 'test');
      const groupId = toDefaultAccountGroupId(walletId);

      expect(groupId.startsWith(walletId)).toBe(true);
      expect(groupId.endsWith(`/${DEFAULT_ACCOUNT_GROUP_UNIQUE_ID}`)).toBe(true);
    });
  });
});
