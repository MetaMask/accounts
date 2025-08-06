import { AccountWalletType, toAccountWalletId } from './wallet';

describe('wallet', () => {
  describe('toAccountWalletId', () => {
    it.each(Object.values(AccountWalletType))(
      'computes a wallet id for: %s',
      (type: AccountWalletType) => {
        const walletId = toAccountWalletId(type, 'test');

        expect(walletId.startsWith(type)).toBe(true);
        expect(walletId.endsWith(':test')).toBe(true);
      },
    );
  });
});
