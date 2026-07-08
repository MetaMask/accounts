import type {
  KeyringAccount,
  KeyringAccountEntropyPrivateKeyOptions,
} from '@metamask/keyring-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';

import { MOCK_HD_ACCOUNT_1 } from '../mocks';
import type { PrivateKeyAccount } from './private-key';
import { isPrivateKeyAccount, assertIsPrivateKeyAccount } from './private-key';

const MOCK_PRIVATE_KEY_ACCOUNT: PrivateKeyAccount<KeyringAccount> = {
  id: 'mock-pk-id-1',
  address: '0x123',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.PrivateKey,
    },
  },
  methods: [
    EthMethod.PersonalSign,
    EthMethod.Sign,
    EthMethod.SignTransaction,
    EthMethod.SignTypedDataV1,
    EthMethod.SignTypedDataV3,
    EthMethod.SignTypedDataV4,
  ],
  type: EthAccountType.Eoa,
  scopes: [EthScope.Eoa],
};

describe('private-key', () => {
  describe('isPrivateKeyAccount', () => {
    it('returns true if the account is a private key account', () => {
      expect(isPrivateKeyAccount(MOCK_PRIVATE_KEY_ACCOUNT)).toBe(true);
      expect(() =>
        assertIsPrivateKeyAccount(MOCK_PRIVATE_KEY_ACCOUNT),
      ).not.toThrow();
    });

    it.each([
      {
        tc: 'missing type',
        options: {
          entropy: {
            // Missing type.
          },
        },
      },
      {
        tc: 'wrong type',
        options: {
          entropy: {
            type: KeyringAccountEntropyTypeOption.Mnemonic,
          },
        },
      },
      {
        tc: 'missing entropy',
        options: {},
      },
    ])(
      'returns false if the account is not a private key account with: $tc',
      ({ options }) => {
        const account = {
          ...MOCK_HD_ACCOUNT_1,
          options: {
            entropy:
              // Force the error case here.
              options as unknown as KeyringAccountEntropyPrivateKeyOptions,
          },
        };

        expect(isPrivateKeyAccount(account)).toBe(false);
        expect(() => assertIsPrivateKeyAccount(account)).toThrow(
          'Account is not private key account',
        );
      },
    );
  });
});
