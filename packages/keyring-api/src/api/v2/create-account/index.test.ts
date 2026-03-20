import { assert, is } from '@metamask/superstruct';

import {
  AccountCreationType,
  assertCreateAccountOptionIsSupported,
  CreateAccountOptionsStruct,
  type CreateAccountBip44DeriveIndexOptions,
  type CreateAccountOptions,
} from '.';

describe('CreateAccountOptionsStruct', () => {
  describe('valid account creation types', () => {
    it('validates Bip44DerivePath type correctly', () => {
      const validBip44DerivePath = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
        derivationPath: "m/44'/0'/0'/0/0",
      };

      expect(is(validBip44DerivePath, CreateAccountOptionsStruct)).toBe(true);
      expect(() =>
        assert(validBip44DerivePath, CreateAccountOptionsStruct),
      ).not.toThrow();
    });

    it('validates Bip44DeriveIndex type correctly', () => {
      const validBip44DeriveIndex = {
        type: AccountCreationType.Bip44DeriveIndex,
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(validBip44DeriveIndex, CreateAccountOptionsStruct)).toBe(true);
      expect(() =>
        assert(validBip44DeriveIndex, CreateAccountOptionsStruct),
      ).not.toThrow();
    });

    it('validates Bip44Discover type correctly', () => {
      const validBip44Discover = {
        type: AccountCreationType.Bip44Discover,
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(validBip44Discover, CreateAccountOptionsStruct)).toBe(true);
      expect(() =>
        assert(validBip44Discover, CreateAccountOptionsStruct),
      ).not.toThrow();
    });

    it('validates PrivateKeyImport type correctly', () => {
      const validPrivateKey = {
        type: AccountCreationType.PrivateKeyImport,
        privateKey: '0x1234567890abcdef',
        encoding: 'hexadecimal',
      };

      expect(is(validPrivateKey, CreateAccountOptionsStruct)).toBe(true);
      expect(() =>
        assert(validPrivateKey, CreateAccountOptionsStruct),
      ).not.toThrow();
    });
  });

  describe('invalid account creation types', () => {
    it('rejects unsupported type with proper error message', () => {
      const invalidType = {
        type: 'unsupported-type',
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(invalidType, CreateAccountOptionsStruct)).toBe(false);
      expect(() => assert(invalidType, CreateAccountOptionsStruct)).toThrow(
        /Expected the literal `"bip44:derive-path"`, but received: "unsupported-type"/u,
      );
    });

    it('rejects missing type field', () => {
      const noType = {
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(noType, CreateAccountOptionsStruct)).toBe(false);
      expect(() => assert(noType, CreateAccountOptionsStruct)).toThrow(
        'Expected the literal `"bip44:derive-path"`, but received: undefined',
      );
    });

    it('rejects null type', () => {
      const nullType = {
        type: null,
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(nullType, CreateAccountOptionsStruct)).toBe(false);
      expect(() => assert(nullType, CreateAccountOptionsStruct)).toThrow(
        'Expected the literal `"bip44:derive-path"`, but received: null',
      );
    });

    it('rejects undefined type', () => {
      const undefinedType = {
        type: undefined,
        entropySource: 'user-input',
        groupIndex: 0,
      };

      expect(is(undefinedType, CreateAccountOptionsStruct)).toBe(false);
      expect(() => assert(undefinedType, CreateAccountOptionsStruct)).toThrow(
        'Expected the literal `"bip44:derive-path"`, but received: undefined',
      );
    });
  });

  describe('type-specific field validation', () => {
    it('rejects Bip44DerivePath type with missing derivationPath', () => {
      const missingDerivationPath = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
      };

      expect(is(missingDerivationPath, CreateAccountOptionsStruct)).toBe(false);
      expect(() =>
        assert(missingDerivationPath, CreateAccountOptionsStruct),
      ).toThrow(/derivationPath/u);
    });

    it('rejects Bip44DeriveIndex type with missing groupIndex', () => {
      const missingGroupIndex = {
        type: AccountCreationType.Bip44DeriveIndex,
        entropySource: 'user-input',
      };

      expect(is(missingGroupIndex, CreateAccountOptionsStruct)).toBe(false);
      expect(() =>
        assert(missingGroupIndex, CreateAccountOptionsStruct),
      ).toThrow(/groupIndex/u);
    });

    it('rejects PrivateKeyImport type with missing privateKey', () => {
      const missingPrivateKey = {
        type: AccountCreationType.PrivateKeyImport,
        encoding: 'hexadecimal',
      };

      expect(is(missingPrivateKey, CreateAccountOptionsStruct)).toBe(false);
      expect(() =>
        assert(missingPrivateKey, CreateAccountOptionsStruct),
      ).toThrow(/privateKey/u);
    });

    it('rejects wrong fields for type (Bip44DerivePath type with groupIndex instead of derivationPath)', () => {
      const wrongFields = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
        groupIndex: 0, // Wrong: should be derivationPath
      };

      expect(is(wrongFields, CreateAccountOptionsStruct)).toBe(false);
      expect(() => assert(wrongFields, CreateAccountOptionsStruct)).toThrow(
        /derivationPath/u,
      );
    });
  });

  describe('selector function behavior', () => {
    it('correctly discriminates based on value.type property', () => {
      // This test verifies the selector reads value.type, not the whole value
      const options = [
        {
          type: AccountCreationType.Bip44DerivePath,
          entropySource: 'test',
          derivationPath: "m/44'/0'/0'/0/0",
        },
        {
          type: AccountCreationType.Bip44DeriveIndex,
          entropySource: 'test',
          groupIndex: 1,
        },
        {
          type: AccountCreationType.Bip44Discover,
          entropySource: 'test',
          groupIndex: 2,
        },
        {
          type: AccountCreationType.PrivateKeyImport,
          privateKey: '0xabc',
          encoding: 'hexadecimal',
        },
      ];

      // All should validate successfully
      options.forEach((option) => {
        expect(is(option, CreateAccountOptionsStruct)).toBe(true);
        expect(() => assert(option, CreateAccountOptionsStruct)).not.toThrow();
      });
    });
  });
});

describe('assertCreateAccountOptionIsSupported', () => {
  describe('when type is supported', () => {
    it('does not throw when type is in supportedTypes array', () => {
      const options = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
        derivationPath: "m/44'/0'/0'/0/0",
      } as CreateAccountOptions;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw when type is the only supported type', () => {
      const options = {
        type: AccountCreationType.PrivateKeyImport,
        privateKey: '0x1234567890abcdef',
        encoding: 'hexadecimal',
      } as CreateAccountOptions;
      const supportedTypes = [AccountCreationType.PrivateKeyImport];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw when all types are supported', () => {
      const options = {
        type: AccountCreationType.Custom,
        scope: 'scope',
      } as CreateAccountOptions;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
        AccountCreationType.Bip44DeriveIndexRange,
        AccountCreationType.Bip44Discover,
        AccountCreationType.PrivateKeyImport,
        AccountCreationType.Custom,
      ];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw for each supported BIP-44 type', () => {
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
        AccountCreationType.Bip44DeriveIndexRange,
        AccountCreationType.Bip44Discover,
      ];

      const optionsMap: Record<AccountCreationType, CreateAccountOptions> = {
        [AccountCreationType.Bip44DerivePath]: {
          type: AccountCreationType.Bip44DerivePath,
          entropySource: 'user-input',
          derivationPath: "m/44'/0'/0'/0/0",
        },
        [AccountCreationType.Bip44DeriveIndex]: {
          type: AccountCreationType.Bip44DeriveIndex,
          entropySource: 'user-input',
          groupIndex: 0,
        },
        [AccountCreationType.Bip44DeriveIndexRange]: {
          type: AccountCreationType.Bip44DeriveIndexRange,
          entropySource: 'user-input',
          range: {
            from: 0,
            to: 1,
          },
        },
        [AccountCreationType.Bip44Discover]: {
          type: AccountCreationType.Bip44Discover,
          entropySource: 'user-input',
          groupIndex: 0,
        },
        [AccountCreationType.PrivateKeyImport]: {
          type: AccountCreationType.PrivateKeyImport,
          privateKey: '0x1234567890abcdef',
          encoding: 'hexadecimal',
        },
        [AccountCreationType.Custom]: {
          type: AccountCreationType.Custom,
          // FIXME: We cannot use custom fields currently with `CreateAccountOptions` type.
          // We need to define a struct manually to open up the type for custom options to
          // allow additional fields.
        },
      };

      supportedTypes.forEach((type) => {
        expect(() =>
          assertCreateAccountOptionIsSupported(
            optionsMap[type],
            supportedTypes,
          ),
        ).not.toThrow();
      });
    });
  });

  describe('when type is not supported', () => {
    it('throws error with correct message when type is not in supportedTypes', () => {
      const options = {
        type: AccountCreationType.Custom,
        scope: 'scope',
      } as CreateAccountOptions;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).toThrow('Unsupported create account option type: custom');
    });

    it('throws error when supportedTypes is empty', () => {
      const options = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
        derivationPath: "m/44'/0'/0'/0/0",
      } as CreateAccountOptions;
      const supportedTypes: AccountCreationType[] = [];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).toThrow('Unsupported create account option type: bip44:derive-path');
    });

    it('throws error for PrivateKeyImport when only BIP-44 types are supported', () => {
      const options = {
        type: AccountCreationType.PrivateKeyImport,
        privateKey: '0x1234567890abcdef',
        encoding: 'hexadecimal',
      } as CreateAccountOptions;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).toThrow('Unsupported create account option type: private-key:import');
    });

    it('throws error for Bip44Discover when not in supportedTypes', () => {
      const options = {
        type: AccountCreationType.Bip44Discover,
        entropySource: 'user-input',
        groupIndex: 0,
      } as CreateAccountOptions;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Custom,
      ];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).toThrow('Unsupported create account option type: bip44:discover');
    });

    it('includes the unsupported type value in error message', () => {
      const options = {
        type: AccountCreationType.Bip44DeriveIndexRange,
        entropySource: 'user-input',
        range: {
          from: 0,
          to: 1,
        },
      } as CreateAccountOptions;
      const supportedTypes = [AccountCreationType.PrivateKeyImport];

      expect(() =>
        assertCreateAccountOptionIsSupported(options, supportedTypes),
      ).toThrow(/bip44:derive-index-range/u);
    });
  });

  describe('type narrowing behavior', () => {
    it('narrows type correctly after assertion passes', () => {
      const options = {
        type: AccountCreationType.Bip44DerivePath,
        entropySource: 'user-input',
        derivationPath: "m/44'/0'/0'/0/0",
      } as CreateAccountOptions;
      const supportedTypes = [
        `${AccountCreationType.Bip44DerivePath}`,
      ] as const;

      assertCreateAccountOptionIsSupported(options, supportedTypes);

      // After the assertion, TypeScript should narrow the type.
      const narrowedType: (typeof supportedTypes)[number] = options.type; // Compile-time check.
      expect(narrowedType).toBe(AccountCreationType.Bip44DerivePath);
    });

    it('narrows CreateAccountOptions type based on supported type', () => {
      const options = {
        type: AccountCreationType.Bip44DeriveIndex,
        entropySource: 'mock-entropy-source',
        groupIndex: 0,
      } as CreateAccountOptions;

      const supportedTypes = [AccountCreationType.Bip44DeriveIndex] as const;
      assertCreateAccountOptionIsSupported(options, supportedTypes);

      // After assertion, options should be narrowed to CreateAccountBip44DeriveIndexOptions
      const narrowedOptions: CreateAccountBip44DeriveIndexOptions = options; // Compile-time check.
      expect(narrowedOptions.type).toBe(AccountCreationType.Bip44DeriveIndex);
    });
  });
});
