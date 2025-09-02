import {
  isMultichainAccountWalletId,
  parseMultichainAccountWalletId,
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
    it('returns true if a account wallet id is a multichain account wallet id', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

      expect(isMultichainAccountWalletId(walletId)).toBe(true);
    });

    it('fails if a account wallet id is not a multichain account wallet id', () => {
      const walletId = toAccountWalletId(
        AccountWalletType.Keyring,
        MOCK_ENTROPY_SOURCE_1,
      );

      expect(isMultichainAccountWalletId(walletId)).toBe(false);
    });
  });

  describe('parseAccountWalletId', () => {
    it('parses multichain account wallet id', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

      expect(parseMultichainAccountWalletId(walletId)).toStrictEqual({
        type: AccountWalletType.Entropy,
        subId: MOCK_ENTROPY_SOURCE_1,
      });
    });

    it('fails to parse invalid account wallet id', () => {
      const walletId = toAccountWalletId(
        AccountWalletType.Keyring,
        MOCK_ENTROPY_SOURCE_1,
      );

      expect(() => parseMultichainAccountWalletId(walletId)).toThrow(
        `Invalid account wallet ID: "${walletId}"`,
      );
    });
  });
});
