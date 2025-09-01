import {
  AccountWalletType,
  getAccountWalletSubId,
  getAccountWalletType,
  parseAccountWalletId,
  toAccountWalletId,
} from './wallet';
import {
  MOCK_ENTROPY_SOURCE_1,
  MOCK_PRIVATE_KEY_KEYRING_TYPE,
  MOCK_SNAP_1,
  MOCK_SNAP_2,
} from '../mocks';

const MOCK_ENTROPY_WALLET_ID = `${AccountWalletType.Entropy}:${MOCK_ENTROPY_SOURCE_1}`;
const MOCK_SNAP_LOCAL_WALLET_ID = `${AccountWalletType.Snap}:${MOCK_SNAP_1.id}`;
const MOCK_SNAP_NPM_WALLET_ID = `${AccountWalletType.Snap}:${MOCK_SNAP_2.id}`;
const MOCK_KEYRING_WALLET_ID = `${AccountWalletType.Keyring}:${MOCK_PRIVATE_KEY_KEYRING_TYPE}`;

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
          'Invalid account wallet ID.',
        );
      },
    );
  });

  describe('getAccountWalletType', () => {
    it.each([
      {
        id: MOCK_ENTROPY_WALLET_ID,
        type: AccountWalletType.Entropy,
      },
      {
        id: MOCK_SNAP_LOCAL_WALLET_ID,
        type: AccountWalletType.Snap,
      },
      {
        id: MOCK_SNAP_NPM_WALLET_ID,
        type: AccountWalletType.Snap,
      },
      {
        id: MOCK_KEYRING_WALLET_ID,
        type: AccountWalletType.Keyring,
      },
    ])('get account wallet type for: %s', ({ id, type }) => {
      expect(getAccountWalletType(id)).toStrictEqual(type);
    });
  });

  describe('getAccountWalletSubId', () => {
    it.each([
      {
        id: MOCK_ENTROPY_WALLET_ID,
        subId: MOCK_ENTROPY_SOURCE_1,
      },
      {
        id: MOCK_SNAP_LOCAL_WALLET_ID,
        subId: MOCK_SNAP_1.id,
      },
      {
        id: MOCK_SNAP_NPM_WALLET_ID,
        subId: MOCK_SNAP_2.id,
      },
      {
        id: MOCK_KEYRING_WALLET_ID,
        subId: MOCK_PRIVATE_KEY_KEYRING_TYPE,
      },
    ])('get account wallet sub-ID for: %s', ({ id, subId }) => {
      expect(getAccountWalletSubId(id)).toStrictEqual(subId);
    });
  });
});
