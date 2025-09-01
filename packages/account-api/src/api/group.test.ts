import {
  DEFAULT_ACCOUNT_GROUP_UNIQUE_ID,
  getAccountGroupSubId,
  getAccountGroupWalletId,
  parseAccountGroupId,
  toAccountGroupId,
  toDefaultAccountGroupId,
} from './group';
import { AccountWalletType, toAccountWalletId } from './wallet';
import {
  MOCK_ENTROPY_GROUP_ID,
  MOCK_ENTROPY_SOURCE_1,
  MOCK_ENTROPY_WALLET_ID,
  MOCK_KEYRING_GROUP_ID,
  MOCK_KEYRING_WALLET_ID,
  MOCK_PRIVATE_KEY_KEYRING_TYPE,
  MOCK_SNAP_1,
  MOCK_SNAP_2,
  MOCK_SNAP_LOCAL_GROUP_ID,
  MOCK_SNAP_LOCAL_WALLET_ID,
  MOCK_SNAP_NPM_GROUP_ID,
  MOCK_SNAP_NPM_WALLET_ID,
} from '../mocks';

const MOCK_INVALID_GROUP_IDS = [
  'invalid-id',
  'entropy/01K3KE7FE52Z62S76VMNYNZH3J:0',
  'keyring:Simple Key Pair@0x456',
];

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
        id: MOCK_ENTROPY_GROUP_ID,
        parsed: {
          wallet: {
            type: AccountWalletType.Entropy,
            subId: MOCK_ENTROPY_SOURCE_1,
          },
          subId: '0',
        },
      },
      {
        id: MOCK_SNAP_LOCAL_GROUP_ID,
        parsed: {
          wallet: {
            type: AccountWalletType.Snap,
            subId: MOCK_SNAP_1.id,
          },
          subId: '0x123',
        },
      },
      {
        id: MOCK_SNAP_NPM_GROUP_ID,
        parsed: {
          wallet: {
            type: AccountWalletType.Snap,
            subId: MOCK_SNAP_2.id,
          },
          subId: '0x456',
        },
      },
      {
        id: MOCK_KEYRING_GROUP_ID,
        parsed: {
          wallet: {
            type: AccountWalletType.Keyring,
            subId: MOCK_PRIVATE_KEY_KEYRING_TYPE,
          },
          subId: '0x789',
        },
      },
    ])('parses account group id for: %s', ({ id, parsed }) => {
      expect(parseAccountGroupId(id)).toStrictEqual(parsed);
    });

    it.each(MOCK_INVALID_GROUP_IDS)(
      'fails to parse invalid account group ID',
      (id) => {
        expect(() => parseAccountGroupId(id)).toThrow(
          'Invalid account group ID.',
        );
      },
    );
  });

  describe('getAccountGroupWalletId', () => {
    it.each([
      {
        id: MOCK_ENTROPY_GROUP_ID,
        walletId: MOCK_ENTROPY_WALLET_ID,
      },
      {
        id: MOCK_SNAP_LOCAL_GROUP_ID,
        walletId: MOCK_SNAP_LOCAL_WALLET_ID,
      },
      {
        id: MOCK_SNAP_NPM_GROUP_ID,
        walletId: MOCK_SNAP_NPM_WALLET_ID,
      },
      {
        id: MOCK_KEYRING_GROUP_ID,
        walletId: MOCK_KEYRING_WALLET_ID,
      },
    ])('get account group wallet ID for: %s', ({ id, walletId }) => {
      expect(getAccountGroupWalletId(id)).toStrictEqual(walletId);
    });
  });

  describe('getAccountGroupSubId', () => {
    it.each([
      {
        id: MOCK_ENTROPY_GROUP_ID,
        subId: '0',
      },
      {
        id: MOCK_SNAP_LOCAL_GROUP_ID,
        subId: '0x123',
      },
      {
        id: MOCK_SNAP_NPM_GROUP_ID,
        subId: '0x456',
      },
      {
        id: MOCK_KEYRING_GROUP_ID,
        subId: '0x789',
      },
    ])('get account group sub-ID for: %s', ({ id, subId }) => {
      expect(getAccountGroupSubId(id)).toStrictEqual(subId);
    });
  });
});
