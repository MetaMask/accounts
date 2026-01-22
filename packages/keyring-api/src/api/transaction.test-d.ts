import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Transaction } from './transaction';

expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
});

expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'receive',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [
    {
      type: 'base',
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
        amount: '0.0001',
      },
    },
    {
      type: 'priority',
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
        amount: '0.0001',
      },
    },
  ],
  events: [],
});

expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: 1728648847,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
        amount: '0.002',
      },
    },
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      asset: {
        fungible: false,
        id: 'bip122:000000000019d6689c085ae165831e93/slip44:0/brc20:0x1234567890abcdef',
      },
    },
  ],
  to: [
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
        amount: '0.001',
      },
    },
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      asset: {
        fungible: false,
        id: 'bip122:000000000019d6689c085ae165831e93/slip44:0/brc20:0x1234567890abcdef',
      },
    },
  ],
  fees: [
    {
      type: 'priority',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
        amount: '0.001',
      },
    },
  ],
  events: [
    {
      status: 'confirmed',
      timestamp: 1728648847,
    },
  ],
});

expectNotAssignable<Transaction>({});

expectNotAssignable<Transaction>({
  // Missing `id`
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  // Missing `timestamp`
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  // Missing `chain`
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  // Missing `status`
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  // Missing `type`
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  // Missing `account`
  from: [],
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  // Missing `from`
  to: [],
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  // Missing `to`
  fees: [],
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  // Missing `fees`
});

expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [
    {
      type: 'invalid-type', // Invalid fee type
      amount: '0.0001',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
      },
    },
  ],
});

// Transaction with full details (valid)
expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: {
    origin: 'https://dapp.test',
    securityAlertResponse: 'benign',
  },
});

// Transaction with empty details object (valid)
expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: {},
});

// Transaction with only origin in details (valid)
expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: {
    origin: 'metamask',
  },
});

// Transaction with only securityAlertResponse in details (valid)
expectAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: {
    securityAlertResponse: 'warning',
  },
});

// Transaction with undefined details (invalid - exactOptional doesn't allow undefined)
expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: undefined,
});

// Transaction with invalid securityAlertResponse (invalid - must be 'benign', 'warning', or 'malicious')
expectNotAssignable<Transaction>({
  id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
  events: [],
  details: {
    securityAlertResponse: 'invalid',
  },
});
