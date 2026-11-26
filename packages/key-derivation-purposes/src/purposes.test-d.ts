import { expectAssignable, expectNotAssignable, expectType } from 'tsd';

import { Purpose } from '.';
import type { KeyDerivationPurpose } from '.';

expectType<'metamask:money-account:mpc:device-share:wrapping-key:v1'>(
  Purpose.MoneyAccountMpcDeviceShareWrappingKey,
);
expectAssignable<KeyDerivationPurpose>(
  Purpose.MoneyAccountMpcDeviceShareWrappingKey,
);
expectAssignable<KeyDerivationPurpose>('metamask:consumer-defined:example:v0');
expectType<Purpose>(Purpose.MoneyAccountMpcDeviceShareWrappingKey);
expectAssignable<KeyDerivationPurpose>({} as Purpose);
expectNotAssignable<Purpose>('metamask:consumer-defined:example:v0');
expectNotAssignable<KeyDerivationPurpose>('example:v1');
expectNotAssignable<KeyDerivationPurpose>('metamask:example');
expectNotAssignable<KeyDerivationPurpose>('metamask:example:vnext');
