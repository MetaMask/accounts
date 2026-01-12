import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Asset } from './asset';

// Valid fungible asset
expectAssignable<Asset>({
  fungible: true,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
  amount: '0.01',
  rawAmount: '10000000000000000',
});

// Valid non-fungible asset
expectAssignable<Asset>({
  fungible: false,
  id: 'hedera:mainnet/nft:0.0.55492/12',
});

// Missing rawAmount for fungible asset
expectNotAssignable<Asset>({
  fungible: true,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
  amount: '0.01',
});

// Fungible asset with non-fungible id field
expectNotAssignable<Asset>({
  fungible: true,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
  amount: '0.01',
  rawAmount: '10000000000000000',
  id: 'hedera:mainnet/nft:0.0.55492/12',
});

// Non-fungible asset with unit field
expectNotAssignable<Asset>({
  fungible: false,
  id: 'hedera:mainnet/nft:0.0.55492/12',
  unit: 'ETH',
});

// Non-fungible asset with type and unit
expectNotAssignable<Asset>({
  fungible: false,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
});

// Fungible asset with id instead of type
expectNotAssignable<Asset>({
  fungible: true,
  id: 'hedera:mainnet/nft:0.0.55492/12',
});
