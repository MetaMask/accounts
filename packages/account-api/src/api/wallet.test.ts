import {
  AccountWalletType,
  parseAccountWalletId,
  toAccountWalletId,
} from './wallet';

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

  describe('parseAccountWalletId', () => {
    it.each([
      {
        id: 'entropy:01K3KE7FE52Z62S76VMNYNZH3J',
        parsed: { type: 'entropy', subId: '01K3KE7FE52Z62S76VMNYNZH3J' },
      },
      {
        id: 'snap:npm:@metamask/snap-simple-keyring-snap',
        parsed: {
          type: 'snap',
          subId: 'npm:@metamask/snap-simple-keyring-snap',
        },
      },
      {
        id: 'keyring:Simple Key Pair',
        parsed: { type: 'keyring', subId: 'Simple Key Pair' },
      },
    ])('parses account wallet id for: %s', ({ id, parsed }) => {
      expect(parseAccountWalletId(id)).toStrictEqual(parsed);
    });

    it.each([
      'invalid-id',
      'entropy/01K3KE7FE52Z62S76VMNYNZH3J',
      'keyring@Simple Key Pair',
      'another:type',
    ])('fails to parse invalid account wallet ID', (id) => {
      expect(() => parseAccountWalletId(id)).toThrow(
        'Invalid account wallet ID.',
      );
    });
  });
});
