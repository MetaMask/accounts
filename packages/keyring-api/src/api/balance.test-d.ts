import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Balance } from './balance';

expectAssignable<Balance>({ amount: '1.0', unit: 'ETH' });
expectAssignable<Balance>({ amount: '0.1', unit: 'BTC' });
expectAssignable<Balance>({ amount: '.1', unit: 'gwei' });
expectAssignable<Balance>({ amount: '.1', unit: 'wei' });
expectAssignable<Balance>({ amount: '1.', unit: 'sat' });

expectNotAssignable<Balance>({ amount: 1, unit: 'ETH' });
expectNotAssignable<Balance>({ amount: true, unit: 'ETH' });
expectNotAssignable<Balance>({ amount: undefined, unit: 'ETH' });
expectNotAssignable<Balance>({ amount: null, unit: 'ETH' });

expectNotAssignable<Balance>({ amount: '1.0', unit: 1 });
expectNotAssignable<Balance>({ amount: '1.0', unit: true });
expectNotAssignable<Balance>({ amount: '1.0', unit: undefined });
expectNotAssignable<Balance>({ amount: '1.0', unit: null });

// metadata is optional and accepts arbitrary JSON-compatible key/value pairs
expectAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  metadata: { foo: 'bar' },
});
expectAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  metadata: { count: 42, flag: true },
});
expectAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  metadata: { nested: { x: 1 } },
});
expectAssignable<Balance>({ amount: '1.0', unit: 'ETH' });

expectNotAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  metadata: 'string',
});
expectNotAssignable<Balance>({ amount: '1.0', unit: 'ETH', metadata: 42 });
