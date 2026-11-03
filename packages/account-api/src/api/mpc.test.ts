import type {
  KeyringAccount,
  KeyringAccountEntropyMpcOptions,
} from '@metamask/keyring-api';
import {
  EthAccountType,
  EthMethod,
  EthScope,
  KeyringAccountEntropyTypeOption,
} from '@metamask/keyring-api';

import { MOCK_HD_ACCOUNT_1 } from '../mocks';
import type { MpcAccount } from './mpc';
import { isMpcAccount, assertIsMpcAccount } from './mpc';

const MOCK_MPC_ACCOUNT: MpcAccount<KeyringAccount> = {
  id: 'mock-mpc-id-1',
  address: '0x123',
  options: {
    entropy: {
      type: KeyringAccountEntropyTypeOption.Mpc,
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

describe('mpc', () => {
  describe('isMpcAccount', () => {
    it('returns true if the account is an MPC account', () => {
      expect(isMpcAccount(MOCK_MPC_ACCOUNT)).toBe(true);
      expect(() => assertIsMpcAccount(MOCK_MPC_ACCOUNT)).not.toThrow();
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
      'returns false if the account is not an MPC account with: $tc',
      ({ options }) => {
        const account = {
          ...MOCK_HD_ACCOUNT_1,
          options: {
            entropy:
              // Force the error case here.
              options as unknown as KeyringAccountEntropyMpcOptions,
          },
        };

        expect(isMpcAccount(account)).toBe(false);
        expect(() => assertIsMpcAccount(account)).toThrow(
          'Account is not an MPC account',
        );
      },
    );
  });
});
