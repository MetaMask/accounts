import { expectAssignable, expectNotAssignable, expectType } from 'tsd';

import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '.';
import type { KeyDerivationPurpose } from '.';

expectType<'metamask:money-account:mfa:encryption-key:v1'>(
  MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE,
);
expectAssignable<KeyDerivationPurpose>(
  MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE,
);
expectAssignable<KeyDerivationPurpose>('metamask:consumer-defined:example:v0');
expectNotAssignable<KeyDerivationPurpose>('example:v1');
expectNotAssignable<KeyDerivationPurpose>('metamask:example');
expectNotAssignable<KeyDerivationPurpose>('metamask:example:vnext');
