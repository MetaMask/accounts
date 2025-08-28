import {
  DEFAULT_ACCOUNT_GROUP_UNIQUE_ID,
  parseAccountGroupId,
  toAccountGroupId,
  toDefaultAccountGroupId,
} from './group';
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
      expect(groupId.endsWith(`/${DEFAULT_ACCOUNT_GROUP_UNIQUE_ID}`)).toBe(
        true,
      );
    });
  });

  describe('parseAccountGroupId', () => {
    it.each([
      {
        id: 'entropy:01K3KE7FE52Z62S76VMNYNZH3J/0',
        parsed: {
          wallet: { type: 'entropy', subId: '01K3KE7FE52Z62S76VMNYNZH3J' },
          subId: '0',
        },
      },
      {
        id: 'snap:npm:@metamask/snap-simple-keyring-snap/0x123',
        parsed: {
          wallet: {
            type: 'snap',
            subId: 'npm:@metamask/snap-simple-keyring-snap',
          },
          subId: '0x123',
        },
      },
      {
        id: 'keyring:Simple Key Pair/0x456',
        parsed: {
          wallet: { type: 'keyring', subId: 'Simple Key Pair' },
          subId: '0x456',
        },
      },
    ])('parses account group id for: %s', ({ id, parsed }) => {
      expect(parseAccountGroupId(id)).toStrictEqual(parsed);
    });

    it.each([
      'invalid-id',
      'entropy:01K3KE7FE52Z62S76VMNYNZH3J:0',
      'keyring:Simple Key Pair@0x456',
    ])('fails to parse invalid account group ID', (id) => {
      expect(() => parseAccountGroupId(id)).toThrow(
        'Invalid account group ID.',
      );
    });
  });
});
