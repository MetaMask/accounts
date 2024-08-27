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
