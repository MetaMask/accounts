import { toMultichainAccountWalletId } from './wallet';
import { MOCK_ENTROPY_SOURCE_1 } from '../../mocks';

describe('multichain wallet', () => {
  describe('toMultichainAccountWalletId', () => {
    it('computes a multichain account wallet id with an entropy source', () => {
      const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

      expect(walletId.endsWith(`:${MOCK_ENTROPY_SOURCE_1}`)).toBe(true);
    });
  });
});
