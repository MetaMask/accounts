import { assert } from '@metamask/superstruct';

import { EthAccountType, KeyringAccountStruct } from './account';

const supportedKeyringAccountTypes = Object.keys(
  KeyringAccountStruct.schema.type.schema,
)
  .map((type: string) => `"${type}"`)
  .join(',');

describe('api', () => {
  const baseAccount = {
    id: '606a7759-b0fb-48e4-9874-bab62ff8e7eb',
    address: '0x000',
    scopes: [],
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

    it.each([
      // Namespace too short (< 3):
      '',
      'a',
      'ei',
      'bi',
      'bi:p122something',
      // Namespace too long (> 8):
      'eip11155111',
      'eip11155111:11155111',
    ])('throws an error if account scopes is: %s', (scope: string) => {
      const account = {
        ...baseAccount,
        type: EthAccountType.Eoa,
        scopes: [scope],
      };
      expect(() => assert(account, KeyringAccountStruct)).toThrow(
        `At path: scopes.0 -- Expected a string matching \`/^(?<namespace>[-a-z0-9]{3,8}):(?<reference>[-_a-zA-Z0-9]{1,32})$/\` but received "${scope}"`,
      );
    });
  });
});
