import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  // Global ignores
  {
    ignores: ['node_modules', 'eslint.config.mjs', '.yarn/**', '**/dist/**', '**/docs/**', '**/coverage/**'],
  },

  // Base + Node.js configs applied globally
  ...compat.extends('@metamask/eslint-config', '@metamask/eslint-config-nodejs'),

  // Global settings and rules
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
      'jsdoc/match-description': [
        'off',
        { matchDescription: '^[A-Z`\\d_][\\s\\S]*[.?!`>)}]$' },
      ],
    },
  },

  // Scripts
  {
    files: ['scripts/*.ts'],
    rules: {
      'n/hashbang': 'off',
    },
  },

  // JavaScript (script mode)
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2020,
    },
  },

  // TypeScript
  ...compat
    .config({
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.packages.json'],
        sourceType: 'module',
      },
      rules: {
        // This rule triggers false positives and doesn't add real type-safety value.
        // See: https://typescript-eslint.io/rules/no-redundant-type-constituents/#when-not-to-use-it
        '@typescript-eslint/no-redundant-type-constituents': 'off',

        // Enable rules that are disabled in `@metamask/eslint-config-typescript`
        '@typescript-eslint/no-explicit-any': 'error',
      },
    })
    .map((config) => ({ ...config, files: ['**/*.ts'] })),

  // Declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/naming-convention': 'warn',
    },
  },

  // Tests
  ...compat
    .extends('@metamask/eslint-config-jest')
    .map((config) => ({
      ...config,
      files: ['**/*.test.{ts,js}', '**/tests/**/*.{ts,js}'],
    })),

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
      'import-x/order': 'off',
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
      'import-x/order': 'off',
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
      'import-x/order': 'off',
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
];
