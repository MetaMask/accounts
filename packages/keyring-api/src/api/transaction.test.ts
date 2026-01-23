import { is } from '@metamask/superstruct';

import { TransactionStruct } from './transaction';

describe('TransactionStruct', () => {
  const baseTransaction = {
    id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
    chain: 'eip155:1',
    account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
    status: 'confirmed',
    timestamp: 1716367781,
    type: 'send',
    from: [],
    to: [],
    fees: [],
    events: [],
  };

  describe('details field', () => {
    it.each([
      // Without details field
      { transaction: baseTransaction, expected: true },
      // With empty details
      { transaction: { ...baseTransaction, details: {} }, expected: true },
      // With only origin
      {
        transaction: {
          ...baseTransaction,
          details: { origin: 'https://dapp.test' },
        },
        expected: true,
      },
      // With only securityAlertResponse
      {
        transaction: {
          ...baseTransaction,
          details: { securityAlertResponse: 'benign' },
        },
        expected: true,
      },
      // With both fields
      {
        transaction: {
          ...baseTransaction,
          details: { origin: 'metamask', securityAlertResponse: 'warning' },
        },
        expected: true,
      },
      // All valid securityAlertResponse values
      {
        transaction: {
          ...baseTransaction,
          details: { securityAlertResponse: 'benign' },
        },
        expected: true,
      },
      {
        transaction: {
          ...baseTransaction,
          details: { securityAlertResponse: 'warning' },
        },
        expected: true,
      },
      {
        transaction: {
          ...baseTransaction,
          details: { securityAlertResponse: 'malicious' },
        },
        expected: true,
      },
      // Invalid securityAlertResponse
      {
        transaction: {
          ...baseTransaction,
          details: { securityAlertResponse: 'invalid' },
        },
        expected: false,
      },
    ])(
      'returns $expected for is($transaction, TransactionStruct)',
      ({ transaction, expected }) => {
        expect(is(transaction, TransactionStruct)).toBe(expected);
      },
    );
  });
});
