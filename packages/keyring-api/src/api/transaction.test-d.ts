import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Transaction } from './transaction';

expectAssignable<Transaction>({
  id: '0x123',
  timestamp: null,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [],
  to: [],
  fees: [],
});

expectAssignable<Transaction>({
  id: '0x123',
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
      amount: '0.0001',
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
      },
    },
    {
      type: 'priority',
      amount: '0.0001',
      asset: {
        fungible: true,
        type: 'eip155:1/slip44:60',
        unit: 'ETH',
      },
    },
  ],
});

expectAssignable<Transaction>({
  id: '0x123',
  timestamp: 1728648847,
  chain: 'eip155:1',
  status: 'submitted',
  type: 'send',
  account: '5cd17616-ea18-4d72-974f-6dbaa3c56d15',
  from: [
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      amount: '0.002',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
      },
    },
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      amount: '1',
      asset: {
        fungible: false,
        id: 'bip122:000000000019d6689c085ae165831e93/slip44:0/brc20:0x1234567890abcdef',
      },
    },
  ],
  to: [
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      amount: '0.001',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
      },
    },
    {
      address: 'tb1q4q7h8wuplrpmkxqvv6rrrq7qyhhjsj5uqcsxqu',
      amount: '1',
      asset: {
        fungible: false,
        id: 'bip122:000000000019d6689c085ae165831e93/slip44:0/brc20:0x1234567890abcdef',
      },
    },
  ],
  fees: [
    {
      type: 'transaction',
      amount: '0.001',
      asset: {
        fungible: true,
        type: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        unit: 'BTC',
      },
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
  id: '0x123',
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
