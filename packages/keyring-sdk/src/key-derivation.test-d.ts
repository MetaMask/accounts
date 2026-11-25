import { MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE } from '@metamask/key-derivation-purposes';
import { expectNotAssignable, expectType } from 'tsd';

import { KeyRoot } from './key-derivation';

expectType<Promise<KeyRoot>>(KeyRoot.fromMnemonic({ mnemonic: '', index: 0 }));
expectType<Promise<KeyRoot>>(KeyRoot.fromMnemonic({ mnemonic: '' }));
expectType<Promise<KeyRoot>>(
  KeyRoot.fromMnemonic({ mnemonic: '', index: undefined }),
);
expectNotAssignable<KeyRoot>(new Uint8Array(32));
expectNotAssignable<KeyRoot>({});

expectNotAssignable<new (bytes: Uint8Array) => KeyRoot>(KeyRoot);

declare const root: KeyRoot;
expectNotAssignable<Uint8Array>(root);
expectType<Promise<Uint8Array>>(
  root.deriveEncryptionKey({ purpose: 'metamask:consumer-defined:v0' }),
);
expectType<Promise<Uint8Array>>(
  root.deriveEncryptionKey({
    purpose: MONEY_ACCOUNT_MPC_DEVICE_SHARE_WRAPPING_KEY_PURPOSE,
  }),
);
expectType<void>(root.destroy());

expectType<Promise<KeyRoot>>(
  KeyRoot.fromMnemonic({
    // @ts-expect-error Mnemonics must be phrase strings, not byte representations.
    mnemonic: new Uint8Array(32),
  }),
);
expectType<Promise<Uint8Array>>(
  // @ts-expect-error Purposes must be namespaced and versioned.
  root.deriveEncryptionKey({ purpose: 'example:v1' }),
);
