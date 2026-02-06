import { assert, is } from '@metamask/superstruct';

import type {
  CreateAccountBip44DeriveIndexOptions,
  CreateAccountOptions,
} from '.';
import {
  AccountCreationType,
  assertCreateAccountOptionTypeIsSupported,
  CreateAccountOptionsStruct,
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

describe('assertCreateAccountOptionTypeIsSupported', () => {
  describe('when type is supported', () => {
    it('does not throw when type is in supportedTypes array', () => {
      const type = AccountCreationType.Bip44DerivePath;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw when type is the only supported type', () => {
      const type = AccountCreationType.PrivateKeyImport;
      const supportedTypes = [AccountCreationType.PrivateKeyImport];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw when all types are supported', () => {
      const type = AccountCreationType.Custom;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
        AccountCreationType.Bip44DeriveIndexRange,
        AccountCreationType.Bip44Discover,
        AccountCreationType.PrivateKeyImport,
        AccountCreationType.Custom,
      ];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).not.toThrow();
    });

    it('does not throw for each supported BIP-44 type', () => {
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
        AccountCreationType.Bip44DeriveIndexRange,
        AccountCreationType.Bip44Discover,
      ];

      supportedTypes.forEach((type) => {
        expect(() =>
          assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
        ).not.toThrow();
      });
    });
  });

  describe('when type is not supported', () => {
    it('throws error with correct message when type is not in supportedTypes', () => {
      const type = AccountCreationType.Custom;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).toThrow('Unsupported create account option type: custom');
    });

    it('throws error when supportedTypes is empty', () => {
      const type = AccountCreationType.Bip44DerivePath;
      const supportedTypes: AccountCreationType[] = [];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).toThrow('Unsupported create account option type: bip44:derive-path');
    });

    it('throws error for PrivateKeyImport when only BIP-44 types are supported', () => {
      const type = AccountCreationType.PrivateKeyImport;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Bip44DeriveIndex,
      ];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).toThrow('Unsupported create account option type: private-key:import');
    });

    it('throws error for Bip44Discover when not in supportedTypes', () => {
      const type = AccountCreationType.Bip44Discover;
      const supportedTypes = [
        AccountCreationType.Bip44DerivePath,
        AccountCreationType.Custom,
      ];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).toThrow('Unsupported create account option type: bip44:discover');
    });

    it('includes the unsupported type value in error message', () => {
      const type = AccountCreationType.Bip44DeriveIndexRange;
      const supportedTypes = [AccountCreationType.PrivateKeyImport];

      expect(() =>
        assertCreateAccountOptionTypeIsSupported(type, supportedTypes),
      ).toThrow(/bip44:derive-index-range/u);
    });
  });

  describe('type narrowing behavior', () => {
    it('narrows type correctly after assertion passes', () => {
      const type: AccountCreationType = AccountCreationType.Bip44DerivePath;
      const supportedTypes = [AccountCreationType.Bip44DerivePath] as const;

      assertCreateAccountOptionTypeIsSupported(type, supportedTypes);

      // After the assertion, TypeScript should narrow the type.
      const narrowedType: (typeof supportedTypes)[number] = type; // Compile-time check.
      expect(narrowedType).toBe(AccountCreationType.Bip44DerivePath);
    });

    it('works with const arrays for type narrowing', () => {
      const supportedTypes = [
        AccountCreationType.Bip44DeriveIndex,
        AccountCreationType.Custom,
      ] as const;

      const type1: AccountCreationType = AccountCreationType.Bip44DeriveIndex;
      assertCreateAccountOptionTypeIsSupported(type1, supportedTypes);
      const narrowedType1: AccountCreationType.Bip44DeriveIndex = type1; // Compile-time check.
      expect(narrowedType1).toBe(AccountCreationType.Bip44DeriveIndex);

      const type2: AccountCreationType = AccountCreationType.Custom;
      assertCreateAccountOptionTypeIsSupported(type2, supportedTypes);
      const narrowedType2: AccountCreationType.Custom = type2; // Compile-time check.
      expect(narrowedType2).toBe(AccountCreationType.Custom);
    });

    it('narrows CreateAccountOptions type based on supported type', () => {
      const options = {
        type: AccountCreationType.Bip44DeriveIndex,
        entropySource: 'mock-entropy-source',
        groupIndex: 0,
      } as CreateAccountOptions;

      const supportedTypes = [AccountCreationType.Bip44DeriveIndex] as const;
      assertCreateAccountOptionTypeIsSupported(options.type, supportedTypes);

      // After assertion, options should be narrowed to CreateAccountBip44DeriveIndexOptions
      const narrowedOptions: CreateAccountBip44DeriveIndexOptions = options; // Compile-time check.
      expect(narrowedOptions.type).toBe(AccountCreationType.Bip44DeriveIndex);
    });
  });
});
