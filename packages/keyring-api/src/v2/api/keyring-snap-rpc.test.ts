import { is } from '@metamask/superstruct';

import {
  AccountTransactionsResultStruct,
  GetAccountTransactionsRequestStruct,
  GetAccountsTransactionsRequestStruct,
  GetAccountsTransactionsResponseStruct,
  KeyringSnapRpcMethod,
  isKeyringSnapRpcMethod,
} from '.';

const ACCOUNT_ID_1 = '4f983fa2-4f53-4c63-a7c2-f9a5ed750041';
const ACCOUNT_ID_2 = 'e95c98f7-d122-4b63-b431-fec44261f52d';

const transaction = {
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  chain: 'eip155:1',
  account: ACCOUNT_ID_1,
  status: 'confirmed',
  timestamp: 1716367781,
  type: 'send',
  from: [],
  to: [],
  fees: [],
  events: [],
};

describe('isKeyringSnapRpcMethod', () => {
  it.each(Object.values(KeyringSnapRpcMethod))(
    'returns true for: "%s"',
    (method) => {
      expect(isKeyringSnapRpcMethod(method)).toBe(true);
    },
  );

  it('returns false for unknown method', () => {
    expect(isKeyringSnapRpcMethod('keyring_unknownMethod')).toBe(false);
  });
});

describe('GetAccountTransactionsRequestStruct', () => {
  it('validates account-specific pagination', () => {
    const request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringSnapRpcMethod.GetAccountTransactions}`,
      params: {
        id: ACCOUNT_ID_1,
        pagination: { limit: 10, next: 'next-cursor' },
      },
    };

    expect(is(request, GetAccountTransactionsRequestStruct)).toBe(true);
  });
});

describe('GetAccountsTransactionsRequestStruct', () => {
  it('validates account-specific pagination', () => {
    const request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringSnapRpcMethod.GetAccountsTransactions}`,
      params: {
        accounts: [
          {
            id: ACCOUNT_ID_1,
            pagination: { limit: 10 },
          },
          {
            id: ACCOUNT_ID_2,
            pagination: { limit: 10, next: 'next-cursor' },
          },
        ],
      },
    };

    expect(is(request, GetAccountsTransactionsRequestStruct)).toBe(true);
  });

  it('rejects shared pagination for all accounts', () => {
    const request = {
      jsonrpc: '2.0',
      id: '7c507ff0-365f-4de0-8cd5-eb83c30ebda4',
      method: `${KeyringSnapRpcMethod.GetAccountsTransactions}`,
      params: {
        ids: [ACCOUNT_ID_1, ACCOUNT_ID_2],
        pagination: { limit: 10 },
      },
    };

    expect(is(request, GetAccountsTransactionsRequestStruct)).toBe(false);
  });
});

describe('GetAccountsTransactionsResponseStruct', () => {
  it('validates partial success results', () => {
    const response = [
      {
        id: ACCOUNT_ID_1,
        success: true,
        transactions: {
          data: [transaction],
          next: null,
        },
      },
      {
        id: ACCOUNT_ID_2,
        success: false,
        error: {
          code: 'account_not_found',
          message: 'Account not found',
          data: {
            accountId: ACCOUNT_ID_2,
          },
        },
      },
    ];

    expect(is(response, GetAccountsTransactionsResponseStruct)).toBe(true);
  });
});

describe('AccountTransactionsResultStruct', () => {
  it('rejects successful results without transactions', () => {
    const result = {
      id: ACCOUNT_ID_1,
      success: true,
    };

    expect(is(result, AccountTransactionsResultStruct)).toBe(false);
  });

  it('rejects failed results without an error', () => {
    const result = {
      id: ACCOUNT_ID_1,
      success: false,
    };

    expect(is(result, AccountTransactionsResultStruct)).toBe(false);
  });
});
