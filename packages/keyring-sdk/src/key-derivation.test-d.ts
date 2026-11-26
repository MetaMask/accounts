import { Purpose } from '@metamask/key-derivation-purposes';
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
  root.deriveSecret({ purpose: 'metamask:consumer-defined:v0', length: 32 }),
);
expectType<Promise<Uint8Array>>(
  root.deriveSecret({
    purpose: Purpose.MoneyAccountMpcDeviceShareWrappingKey,
    length: 32,
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
  root.deriveSecret({ purpose: 'example:v1', length: 32 }),
);

expectType<Promise<Uint8Array>>(
  // @ts-expect-error Output length is required.
  root.deriveSecret({ purpose: 'metamask:consumer-defined:v0' }),
);

expectType<Promise<Uint8Array>>(
  // @ts-expect-error Output length must be a number.
  root.deriveSecret({ purpose: 'metamask:consumer-defined:v0', length: '32' }),
);
