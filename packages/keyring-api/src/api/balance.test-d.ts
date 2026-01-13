import { expectAssignable, expectNotAssignable } from 'tsd';

import type { Balance } from './balance';

// Valid balances with all required fields
expectAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  rawAmount: '1000000000000000000',
});
expectAssignable<Balance>({
  amount: '0.1',
  unit: 'BTC',
  rawAmount: '10000000',
});
expectAssignable<Balance>({
  amount: '.1',
  unit: 'gwei',
  rawAmount: '100000000',
});
expectAssignable<Balance>({
  amount: '.1',
  unit: 'wei',
  rawAmount: '100000000',
});
expectAssignable<Balance>({
  amount: '1.',
  unit: 'sat',
  rawAmount: '100000000',
});

// Missing rawAmount
expectNotAssignable<Balance>({ amount: '1.0', unit: 'ETH' });

// Invalid amount types
expectNotAssignable<Balance>({
  amount: 1,
  unit: 'ETH',
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: true,
  unit: 'ETH',
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: undefined,
  unit: 'ETH',
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: null,
  unit: 'ETH',
  rawAmount: '1000000000000000000',
});

// Invalid unit types
expectNotAssignable<Balance>({
  amount: '1.0',
  unit: 1,
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: '1.0',
  unit: true,
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: '1.0',
  unit: undefined,
  rawAmount: '1000000000000000000',
});
expectNotAssignable<Balance>({
  amount: '1.0',
  unit: null,
  rawAmount: '1000000000000000000',
});

// Invalid rawAmount types
expectNotAssignable<Balance>({ amount: '1.0', unit: 'ETH', rawAmount: 1 });
expectNotAssignable<Balance>({ amount: '1.0', unit: 'ETH', rawAmount: true });
expectNotAssignable<Balance>({
  amount: '1.0',
  unit: 'ETH',
  rawAmount: undefined,
});
expectNotAssignable<Balance>({ amount: '1.0', unit: 'ETH', rawAmount: null });
