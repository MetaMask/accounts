import { assert } from '@metamask/superstruct';

import {
  KeyringAccountEntropyTypeOption,
  KeyringAccountOptionsStruct,
} from './account-options';

describe('api', () => {
  describe('KeyringAccountOptionsStruct', () => {
    const baseEntropyMnemonicOptions = {
      type: KeyringAccountEntropyTypeOption.Mnemonic,
      id: '01K0BX6VDR5DPDPGGNA8PZVBVB',
      derivationPath: "m/44'/60'/0'/0/0",
    };

    it.each([
      {},
      { exportable: true },
      { exportable: false },
      { entropy: { type: KeyringAccountEntropyTypeOption.PrivateKey } },
      {
        entropy: { type: KeyringAccountEntropyTypeOption.PrivateKey },
        exportable: true,
      },
      {
        entropy: { type: KeyringAccountEntropyTypeOption.PrivateKey },
        exportable: false,
      },
      {
        entropy: { type: KeyringAccountEntropyTypeOption.Custom },
      },
      {
        entropy: { type: KeyringAccountEntropyTypeOption.Custom },
        exportable: true,
      },
      {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Custom,
          customProperty: 123,
        },
        exportable: false,
      },
      {
        entropy: {
          ...baseEntropyMnemonicOptions,
          groupIndex: 0,
        },
      },
      {
        entropy: {
          ...baseEntropyMnemonicOptions,
          groupIndex: 1,
        },
        exportable: true,
      },
      {
        entropy: {
          ...baseEntropyMnemonicOptions,
          groupIndex: 2,
        },
        exportable: false,
      },
    ])('validates options for entropy source: %s', (options) => {
      expect(() => assert(options, KeyringAccountOptionsStruct)).not.toThrow();
    });

    it('validates legacy options', () => {
      const options = {
        some: {
          untyped: 'options',
          something: true,
        },
      };

      expect(() => assert(options, KeyringAccountOptionsStruct)).not.toThrow();
    });

    it('throws if legacy options partially matches options.entropy.type', () => {
      const options = {
        entropy: {
          type: KeyringAccountEntropyTypeOption.Mnemonic,
          // Nothing else, like if it was legacy.
        },
      };

      expect(() => assert(options, KeyringAccountOptionsStruct)).toThrow(
        'At path: entropy.id -- Expected a string, but received: undefined',
      );
    });

    it('throws if legacy options partially matches options.exportable', () => {
      const options = {
        exportable: 'maybe',
      };

      expect(() => assert(options, KeyringAccountOptionsStruct)).toThrow(
        'At path: exportable -- Expected a value of type `boolean`, but received: `"maybe"`',
      );
    });
  });

  it('throws if options.entropy.type is not known', () => {
    const options = { entropy: { type: 'unknown', something: 'else' } };

    expect(() => assert(options, KeyringAccountOptionsStruct)).toThrow(
      `At path: entropy.type -- Expected the literal \`"mnemonic"\`, but received: "${options.entropy.type}"`,
    );
  });
});
