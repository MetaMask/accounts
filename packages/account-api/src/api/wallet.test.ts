import {
  AccountWalletType,
  stripAccountWalletType,
  parseAccountWalletId,
  toAccountWalletId,
  isAccountWalletId,
} from './wallet';
import {
  MOCK_ENTROPY_SOURCE_1,
  MOCK_ENTROPY_WALLET_ID,
  MOCK_KEYRING_WALLET_ID,
  MOCK_PRIVATE_KEY_KEYRING_TYPE,
  MOCK_SNAP_1,
  MOCK_SNAP_2,
  MOCK_SNAP_LOCAL_WALLET_ID,
  MOCK_SNAP_NPM_WALLET_ID,
} from '../mocks';

const MOCK_INVALID_WALLET_IDS = [
  'invalid-id',
  'entropy/01K3KE7FE52Z62S76VMNYNZH3J',
  'keyring@Simple Key Pair',
  'another:type',
];

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

  describe('isAccountWalletId', () => {
    it.each([
      MOCK_ENTROPY_WALLET_ID,
      MOCK_SNAP_LOCAL_WALLET_ID,
      MOCK_SNAP_NPM_WALLET_ID,
      MOCK_KEYRING_WALLET_ID,
    ])('returns true if ID is valid: %s', (id) => {
      expect(isAccountWalletId(id)).toBe(true);
    });

    it.each(MOCK_INVALID_WALLET_IDS)(
      'returns false if ID is valid: %s',
      (id) => {
        expect(isAccountWalletId(id)).toBe(false);
      },
    );
  });

  describe('parseAccountWalletId', () => {
    it.each([
      {
        id: MOCK_ENTROPY_WALLET_ID,
        parsed: {
          type: AccountWalletType.Entropy,
          subId: MOCK_ENTROPY_SOURCE_1,
        },
      },
      {
        id: MOCK_SNAP_LOCAL_WALLET_ID,
        parsed: {
          type: AccountWalletType.Snap,
          subId: MOCK_SNAP_1.id,
        },
      },
      {
        id: MOCK_SNAP_NPM_WALLET_ID,
        parsed: {
          type: AccountWalletType.Snap,
          subId: MOCK_SNAP_2.id,
        },
      },
      {
        id: MOCK_KEYRING_WALLET_ID,
        parsed: {
          type: AccountWalletType.Keyring,
          subId: MOCK_PRIVATE_KEY_KEYRING_TYPE,
        },
      },
    ])('parses account wallet id for: %s', ({ id, parsed }) => {
      expect(parseAccountWalletId(id)).toStrictEqual(parsed);
    });

    it.each(MOCK_INVALID_WALLET_IDS)(
      'fails to parse invalid account wallet ID',
      (id) => {
        expect(() => parseAccountWalletId(id)).toThrow(
          'Invalid account wallet ID',
        );
      },
    );
  });

  describe('stripAccountWalletType', () => {
    it.each([
      {
        id: MOCK_ENTROPY_WALLET_ID,
        stripped: MOCK_ENTROPY_SOURCE_1,
      },
      {
        id: MOCK_SNAP_LOCAL_WALLET_ID,
        stripped: MOCK_SNAP_1.id,
      },
      {
        id: MOCK_SNAP_NPM_WALLET_ID,
        stripped: MOCK_SNAP_2.id,
      },
      {
        id: MOCK_KEYRING_WALLET_ID,
        stripped: MOCK_PRIVATE_KEY_KEYRING_TYPE,
      },
    ])('get account wallet sub-ID for: %s', ({ id, stripped }) => {
      expect(stripAccountWalletType(id)).toStrictEqual(stripped);
    });

    it.each(MOCK_INVALID_WALLET_IDS)(
      'returns the input if not valid for: %s',
      (id) => {
        expect(stripAccountWalletType(id)).toStrictEqual(id);
      },
    );
  });
});
