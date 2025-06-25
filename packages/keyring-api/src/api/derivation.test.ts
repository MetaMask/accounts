import { is } from '@metamask/superstruct';

import { DerivationPathStruct } from './derivation';

describe('DerivationPathStruct', () => {
  it.each([
    `m/44'`,
    `m/44'/0'`,
    `m/44'/0'/0'`,
    `m/44'/0'/0'/0/0`,
    `m/44'/0'/0'/0/0/123`,
  ])('returns true for is(%s, DerivationPathStruct)', (derivationPath) => {
    expect(is(derivationPath, DerivationPathStruct)).toBe(true);
  });

  it.each([`m/`, `m/''`, `m/foobar`])(
    'returns false for is(%s, DerivationPathStruct)',
    (derivationPath) => {
      expect(is(derivationPath, DerivationPathStruct)).toBe(false);
    },
  );
});
