import { toMultichainAccountWalletId } from './wallet';
import { MOCK_ENTROPY_SOURCE_1 } from '../../mocks';

describe('multichain', () => {
  describe('wallet', () => {
    describe('toMultichainAccountWalletId', () => {
      it('returns true if a group id is a multichain group id', () => {
        const walletId = toMultichainAccountWalletId(MOCK_ENTROPY_SOURCE_1);

        expect(walletId).toContain(MOCK_ENTROPY_SOURCE_1);
      });
    });
  });
});
