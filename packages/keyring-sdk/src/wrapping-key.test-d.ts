import { expectNotAssignable, expectType } from 'tsd';

import { deriveWrappingKey, deriveWrappingKeyRoot } from './wrapping-key';
import type { WrappingKeyRoot } from './wrapping-key';

expectType<Promise<WrappingKeyRoot>>(
  deriveWrappingKeyRoot({ mnemonic: '', index: 0 }),
);
expectNotAssignable<WrappingKeyRoot>(new Uint8Array(32));
expectNotAssignable<WrappingKeyRoot>({});

declare const root: WrappingKeyRoot;
expectNotAssignable<Uint8Array>(root);
expectType<Promise<Uint8Array>>(
  deriveWrappingKey({ root, purpose: 'example:v1' }),
);

expectType<Promise<WrappingKeyRoot>>(
  deriveWrappingKeyRoot({
    // @ts-expect-error Mnemonics must be phrase strings, not packed indices or UTF-8 bytes.
    mnemonic: new Uint8Array(32),
    index: 0,
  }),
);
