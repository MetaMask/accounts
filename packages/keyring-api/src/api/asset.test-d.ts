import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Asset } from './asset';

expectAssignable<Asset>({
  fungible: true,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
  amount: '0.01',
});

expectAssignable<Asset>({
  fungible: false,
  id: 'hedera:mainnet/nft:0.0.55492/12',
});

expectNotAssignable<Asset>({
  fungible: true,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
  id: 'hedera:mainnet/nft:0.0.55492/12',
});

expectNotAssignable<Asset>({
  fungible: false,
  id: 'hedera:mainnet/nft:0.0.55492/12',
  unit: 'ETH',
});

expectNotAssignable<Asset>({
  fungible: false,
  type: 'eip155:1/slip44:60',
  unit: 'ETH',
});

expectNotAssignable<Asset>({
  fungible: true,
  id: 'hedera:mainnet/nft:0.0.55492/12',
});
