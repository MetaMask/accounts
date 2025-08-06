import type { MultichainAccountGroupId } from './group';
import {
  getGroupIndexFromMultichainAccountGroupId,
  isMultichainAccountGroupId,
  toMultichainAccountGroupId,
} from './group';
import { toMultichainAccountWalletId } from './wallet';
import { MOCK_ENTROPY_SOURCE_1 } from '../../mocks';
import { toAccountGroupId } from '../group';
import { AccountWalletType, toAccountWalletId } from '../wallet';

describe('multichain group', () => {
  describe('toMultichainAccountGroupId', () => {
    it('computes a multichain account group id with a group index', () => {
      const groupIndex = 1;

      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);
      const groupId = toMultichainAccountGroupId(walletId, groupIndex);

      expect(groupId.startsWith(walletId)).toBe(true);
      expect(groupId.endsWith(`/${groupIndex}`)).toBe(true);
    });
  });

  describe('isMultichainAccountGroupId', () => {
    it('returns true if a group id is a multichain group id', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);
      const groupId = toMultichainAccountGroupId(walletId, 0);

      expect(isMultichainAccountGroupId(groupId)).toBe(true);
    });

    it('fails if a group id is not a multichain group id', () => {
      const walletId = toAccountWalletId(
        AccountWalletType.Keyring,
        MOCK_ENTROPY_SOURCE_1,
      );
      const groupId = toAccountGroupId(walletId, 'test');

      expect(isMultichainAccountGroupId(groupId)).toBe(false);
    });
  });

  describe('getGroupIndexFromMultichainAccountGroupId', () => {
    it('extracts the group index from its group id', () => {
      const groupIndex = 2;

      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);
      const groupId = toMultichainAccountGroupId(walletId, groupIndex);

      expect(getGroupIndexFromMultichainAccountGroupId(groupId)).toBe(
        groupIndex,
      );
    });

    it('throws if it cannot extract group index', () => {
      const walletId = toAccountWalletId(
        AccountWalletType.Keyring,
        MOCK_ENTROPY_SOURCE_1,
      );
      const groupId = toAccountGroupId(walletId, 'test');

      expect(() =>
        getGroupIndexFromMultichainAccountGroupId(
          // Force the error case even though, type wise, this should not
          // be possible!
          groupId as unknown as MultichainAccountGroupId,
        ),
      ).toThrow('Unable to extract group index');
    });
  });
});
