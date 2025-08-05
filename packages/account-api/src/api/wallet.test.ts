import { AccountWalletType, toAccountWalletId } from './wallet';

describe('multichain', () => {
  describe('wallet', () => {
    describe('toMultichainAccountWalletId', () => {
      it.each(Object.values(AccountWalletType))(
        'computes a wallet id for: %s',
        (type: AccountWalletType) => {
          const walletId = toAccountWalletId(type, 'test');

          expect(walletId).toContain(type);
          expect(walletId).toContain('test');
        },
      );
    });
  });
});
