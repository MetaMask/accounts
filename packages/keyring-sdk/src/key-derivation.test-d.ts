import { MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE } from '@metamask/key-derivation-purposes';
import type { KeyDerivationPurpose } from '@metamask/key-derivation-purposes';
import { expectNotAssignable, expectType } from 'tsd';

import { deriveEncryptionKey, deriveKeyRoot } from './key-derivation';
import type { KeyRoot } from './key-derivation';

expectType<Promise<KeyRoot>>(deriveKeyRoot({ mnemonic: '', index: 0 }));
expectNotAssignable<KeyRoot>(new Uint8Array(32));
expectNotAssignable<KeyRoot>({});

declare const root: KeyRoot;
expectNotAssignable<Uint8Array>(root);
expectType<Promise<Uint8Array>>(
  deriveEncryptionKey({ root, purpose: 'metamask:example:v1' }),
);
expectType<Promise<Uint8Array>>(
  deriveEncryptionKey({
    root,
    purpose: MONEY_ACCOUNT_MFA_ENCRYPTION_KEY_PURPOSE,
  }),
);

expectNotAssignable<KeyDerivationPurpose>('example:v1');
expectNotAssignable<KeyDerivationPurpose>('metamask:example');
expectNotAssignable<KeyDerivationPurpose>('metamask:example:vnext');
expectNotAssignable<KeyDerivationPurpose>('metamask:example:v');

expectType<Promise<KeyRoot>>(
  deriveKeyRoot({
    // @ts-expect-error Mnemonics must be phrase strings, not packed indices or UTF-8 bytes.
    mnemonic: new Uint8Array(32),
    index: 0,
  }),
);
