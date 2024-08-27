import { assert } from '@metamask/superstruct';

import { KeyringAccountStruct } from './account';

const supportedKeyringAccountTypes = Object.keys(
  KeyringAccountStruct.schema.type.schema,
)
  .map((type: string) => `"${type}"`)
  .join(',');

describe('api', () => {
  const baseAccount = {
    id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
    address: '0x000',
    options: {},
    methods: [],
  };

  describe('KeyringAccount', () => {
    it.each([
      [undefined, 'undefined'],
      [null, 'null'],
      ['not:supported', '"not:supported"'],
    ])(
      'throws an error if account type is: %s',
      (type: any, typeAsStr: string) => {
        const account = {
          type,
          ...baseAccount,
        };
        expect(() => assert(account, KeyringAccountStruct)).toThrow(
          `At path: type -- Expected one of \`${supportedKeyringAccountTypes}\`, but received: ${typeAsStr}`,
        );
      },
    );
  });
});
