// @ts-check

import base, { createConfig } from '@metamask/eslint-config';
import jest from '@metamask/eslint-config-jest';
import nodejs from '@metamask/eslint-config-nodejs';
import typescript from '@metamask/eslint-config-typescript';

const config = createConfig([
  ...base,

  {
    ignores: [
      'node_modules',
      'eslint.config.mjs',
      '.yarn/**',
      '**/dist/**',
      '**/docs/**',
      '**/coverage/**',
    ],
  },

  {
    rules: {
      // Handled by Oxfmt.
      'prettier/prettier': 'off',
      'import-x/order': 'off',
    },
  },

  {
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      jsdoc: {
        mode: 'typescript',
      },
    },
    rules: {
      // TODO: Re-enable this rule
      // Enabling it with error suppression breaks `--fix`, because the autofixer for this rule
      // does not work very well.
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/match-description': [
        'off',
        { matchDescription: '^[A-Z`\\d_][\\s\\S]*[.?!`>)}]$' },
      ],
    },
  },

  // Node.js
  {
    files: [
      '**/*.{js,cjs,mjs}',
      '**/*.test.{ts,js}',
      '**/tests/**/*.{ts,js}',
      'scripts/*.ts',
    ],
    extends: [nodejs],
  },

  // JavaScript (script mode)
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2020,
    },
  },

  // Scripts (non-TypeScript rules)
  {
    files: ['scripts/*.ts'],
    rules: {
      'n/hashbang': 'off',
    },
  },

  // TypeScript
  {
    files: ['**/*.ts'],
    extends: [typescript],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: ['scripts/*.ts'],
          defaultProject: 'tsconfig.scripts.json',
        },
      },
    },
    rules: {
      // This rule triggers false positives and doesn't add real type-safety value.
      // See: https://typescript-eslint.io/rules/no-redundant-type-constituents/#when-not-to-use-it
      '@typescript-eslint/no-redundant-type-constituents': 'off',

      // Enable rules that are disabled in `@metamask/eslint-config-typescript`
      '@typescript-eslint/no-explicit-any': 'error',

      // TODO: Re-enable these rules
      // Enabling them with error suppression breaks `--fix`, because the autofixer for these rules
      // does not work very well.
      'jsdoc/check-tag-names': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },

  // Scripts TypeScript overrides — tsconfig.scripts.json does not enable `strictNullChecks`
  {
    files: ['scripts/*.ts'],
    rules: {
      '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
    },
  },

  // Declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 'warn',
    },
  },

  // Tests
  {
    files: ['**/*.test.{ts,js}', '**/tests/**/*.{ts,js}'],
    extends: [jest],
  },

  // Files that don't use ES modules
  {
    files: ['tests/setup.ts', 'packages/*/jest.config.js'],
    rules: {
      'import-x/unambiguous': 'off',
    },
  },

  // @metamask/keyring-utils
  {
    files: ['packages/keyring-utils/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // @metamask/keyring-api
  {
    files: ['packages/keyring-api/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      'jsdoc/newline-after-description': 'off',
    },
  },

  // @metamask/keyring-internal-api
  {
    files: ['packages/keyring-internal-api/src/**/*.ts'],
    rules: {
      // FIXME: for some reason, it seems eslint is not able to infer those (this
      // works on the original repository, so there might be some side-effects now that
      // we are building in a monorepo)
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // @metamask/keyring-eth-hd
  {
    files: ['packages/keyring-eth-hd/**/*.js'],
    ignores: ['packages/keyring-eth-hd/jest.config.js'],
    rules: {
      // TODO: re-lint everything once the migration is done
      'id-denylist': 'off',
      'id-length': 'off',
      'import-x/unambiguous': 'off',
      'jsdoc/no-types': 'off',
      'n/no-unpublished-require': 'off',
      'no-undef': 'off',
    },
  },

  // @metamask/keyring-eth-simple
  {
    files: ['packages/keyring-eth-simple/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  // @metamask/keyring-eth-ledger-bridge
  {
    files: ['packages/keyring-eth-ledger-bridge/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-shadow': 'off',
      'no-restricted-globals': 'off',
      'n/prefer-global/buffer': 'off',
    },
  },
  {
    files: ['packages/keyring-eth-ledger-bridge/test/**/*.shim.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-globals': 'off',
    },
  },

  // @metamask/keyring-eth-trezor
  {
    files: ['packages/keyring-eth-trezor/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-shadow': 'off',
      '@typescript-eslint/promise-function-async': 'off',
      'id-denylist': 'off',
      'id-length': 'off',
      'jsdoc/check-tag-names': 'off',
      'jsdoc/require-description': 'off',
      'jsdoc/require-jsdoc': 'off',
      'jsdoc/require-param': 'off',
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/tag-lines': 'off',
      'n/no-callback-literal': 'off',
      'promise/no-multiple-resolved': 'off',
    },
  },

  // @metamask/keyring-snap-bridge
  {
    files: ['packages/keyring-snap-bridge/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/no-explicit-any': 'off',
      // FIXME: for some reason, it seems eslint is not able to infer those (this
      // works on the original repository, so there might be some side-effects now that
      // we are building in a monorepo)
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // @metamask/keyring-snap-sdk
  {
    files: ['packages/keyring-snap-sdk/src/**/*.test.ts'],
    rules: {
      // FIXME: for some reason, it seems eslint is not able to infer those (this
      // works on the original repository, so there might be some side-effects now that
      // we are building in a monorepo)
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // @metamask/keyring-snap-client
  {
    files: ['packages/keyring-snap-client/src/**/*.ts'],
    rules: {
      // TODO: re-lint everything once the migration is done
      '@typescript-eslint/no-explicit-any': 'off',
      // FIXME: for some reason, it seems eslint is not able to infer those (this
      // works on the original repository, so there might be some side-effects now that
      // we are building in a monorepo)
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
]);

export default config;
