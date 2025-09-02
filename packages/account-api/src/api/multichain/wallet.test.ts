import {
  isMultichainAccountWalletId,
  toMultichainAccountWalletId,
} from './wallet';
import { MOCK_ENTROPY_SOURCE_1 } from '../../mocks';
import { AccountWalletType, toAccountWalletId } from '../wallet';

describe('multichain wallet', () => {
  describe('toMultichainAccountWalletId', () => {
    it('computes a multichain account wallet id with an entropy source', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

      expect(walletId.endsWith(`:${MOCK_ENTROPY_SOURCE_1}`)).toBe(true);
    });
  });

  describe('isMultichainAccountGroupId', () => {
    it('returns true if a group id is a multichain group id', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

      expect(isMultichainAccountWalletId(walletId)).toBe(true);
    });

    it('fails if a group id is not a multichain group id', () => {
      const walletId = toAccountWalletId(
        AccountWalletType.Keyring,
        MOCK_ENTROPY_SOURCE_1,
      );

      expect(isMultichainAccountWalletId(walletId)).toBe(false);
    });
  });
});
