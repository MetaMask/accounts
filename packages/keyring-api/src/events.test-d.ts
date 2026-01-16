import { expectAssignable, expectNotAssignable } from 'tsd';

import { EthAccountType } from './api';
import { EthScope } from './eth';
import type { KeyringEventPayload, KeyringEvent } from './events';

expectAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    // Missing `id`
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    // Missing `address`
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    // Missing `methods`
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    // Missing `options`
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    // Missing `scopes`
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    // Missing `type`
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountCreated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
    // Extra field
    index: 1,
  },
});

// ---------------------------------------------------------------------------

expectAssignable<KeyringEventPayload<KeyringEvent.AccountDeleted>>({
  id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountDeleted>>({
  // Missing `id`
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountDeleted>>({
  // Extra field
  address: '0x123',
});

// ---------------------------------------------------------------------------

expectAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    // Missing `id`
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    // Missing `address`
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    // Missing `methods`
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    // Missing `options`
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    // Missing `scopes`
    type: EthAccountType.Eoa,
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    // Missing `type`
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountUpdated>>({
  account: {
    id: '11027d05-12f8-4ec0-b03f-151d86a8089e',
    address: '0x0123',
    methods: [],
    options: {},
    scopes: [EthScope.Eoa],
    type: EthAccountType.Eoa,
    // Extra field
    index: 1,
  },
});

// ---------------------------------------------------------------------------

expectAssignable<KeyringEventPayload<KeyringEvent.AccountBalancesUpdated>>({
  balances: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      'bip122:000000000019d6689c085ae165831e93/slip44:0': {
        amount: '0.0001',
        unit: 'BTC',
        rawAmount: '10000',
      },
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountBalancesUpdated>>({
  // Missing `balances`
  '11027d05-12f8-4ec0-b03f-151d86a8089e': {
    'bip122:000000000019d6689c085ae165831e93/slip44:0': {
      amount: '0.0001',
      unit: 'BTC',
      rawAmount: '10000',
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountBalancesUpdated>>({
  balances: {
    // Missing `accountId` key
    'bip122:000000000019d6689c085ae165831e93/slip44:0': {
      amount: '0.0001',
      unit: 'BTC',
      rawAmount: '10000',
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountBalancesUpdated>>({
  balances: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      // Not CAIP-19 compliant
      bitcoin: {
        amount: '0.0001',
        unit: 'BTC',
        rawAmount: '10000',
      },
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountBalancesUpdated>>({
  balances: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      'bip122:000000000019d6689c085ae165831e93/slip44:0': {
        // Missing `rawAmount`
        amount: '0.0001',
        unit: 'BTC',
      },
    },
  },
});

// ---------------------------------------------------------------------------

expectAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  assets: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      added: [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
      ],
      removed: [
        'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      ],
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  // Missing `assets`
  '11027d05-12f8-4ec0-b03f-151d86a8089e': {
    added: [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    ],
    removed: [
      'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
    ],
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  assets: {
    // Missing `accountId` key
    added: [
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
    ],
    removed: [
      'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
    ],
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  assets: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      // Missing `added`
      removed: [
        'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      ],
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  assets: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      added: [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
      ],
      // Missing `removed`
    },
  },
});

expectNotAssignable<KeyringEventPayload<KeyringEvent.AccountAssetListUpdated>>({
  assets: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': {
      added: [
        'bip122:000000000019d6689c085ae165831e93/slip44:0',
        'bip122:12a765e31ffd4059bada1e25190f6e98/slip44:2',
      ],
      removed: [
        'eip155:1/erc721:0x06012c8cf97BEaD5deAe237070F9587f8E7A266d/771769',
      ],
      // Extra field
      updated: ['eip155:1/slip44:60'],
    },
  },
});

// ---------------------------------------------------------------------------

expectAssignable<KeyringEventPayload<KeyringEvent.AccountTransactionsUpdated>>({
  transactions: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': [
      {
        id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
        timestamp: null,
        chain: 'eip155:1',
        status: 'submitted',
        type: 'send',
        account: '11027d05-12f8-4ec0-b03f-151d86a8089e',
        from: [],
        to: [],
        fees: [],
        events: [],
      },
    ],
  },
});

expectNotAssignable<
  KeyringEventPayload<KeyringEvent.AccountTransactionsUpdated>
>({
  // Missing `transactions`
  '11027d05-12f8-4ec0-b03f-151d86a8089e': [
    {
      id: 'f5d8ee39a430901c91a5917b9f2dc19d6d1a0e9cea205b009ca73dd04470b9a6',
      timestamp: null,
      chain: 'eip155:1',
      status: 'submitted',
      type: 'send',
      account: '11027d05-12f8-4ec0-b03f-151d86a8089e',
      from: [],
      to: [],
      fees: [],
      events: [],
    },
  ],
});

expectNotAssignable<
  KeyringEventPayload<KeyringEvent.AccountTransactionsUpdated>
>({
  transactions: [
    // Missing `accountId` key
    {
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
    },
  ],
});

expectNotAssignable<
  KeyringEventPayload<KeyringEvent.AccountTransactionsUpdated>
>({
  transactions: {
    '11027d05-12f8-4ec0-b03f-151d86a8089e': [
      {
        // Missing `id`
        timestamp: null,
        chain: 'eip155:1',
        status: 'submitted',
        type: 'send',
        account: '11027d05-12f8-4ec0-b03f-151d86a8089e',
        from: [],
        to: [],
        fees: [],
        events: [],
      },
    ],
  },
});
