// Every packages uses the same root tsconfig.packages.json file:
const parserOptions = {
  tsconfigRootDir: __dirname,
  project: ['./tsconfig.packages.json'],
};

module.exports = {
  root: true,
  extends: ['@metamask/eslint-config', '@metamask/eslint-config-nodejs'],
  ignorePatterns: [
    '!.eslintrc.js',
    '!jest.config.js',
    'node_modules',
    '**/dist',
    '**/docs',
    '**/coverage',
  ],
  overrides: [
    // Tests
    {
      files: ['*.test.{ts,js}', '**/tests/**/*.{ts,js}'],
      extends: ['@metamask/eslint-config-jest'],
    },
    {
      files: ['tests/setup.ts'],
      rules: {
        'import/unambiguous': 'off',
      },
    },
    {
      files: ['packages/*/jest.config.js'],
      rules: {
        'import/unambiguous': 'off',
      },
    },
    // JavaScript
    {
      files: ['*.js', '*.cjs'],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: '2020',
      },
    },
    // TypeScript
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
      rules: {
        // Enable rules that are disabled in `@metamask/eslint-config-typescript`
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
    {
      files: ['*.d.ts'],
      rules: {
        '@typescript-eslint/naming-convention': 'warn',
      },
    },
    // @metamask/keyring-api
    {
      files: ['packages/keyring-api/src/**/*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
      rules: {
        // TODO: re-lint everything once the migration is done
        'import/order': 'off',
        'jsdoc/newline-after-description': 'off',
      },
    },
    // @metamask/keyring-eth-hd
    {
      files: ['packages/keyring-eth-hd/**/*.js'],
      extends: ['@metamask/eslint-config-nodejs'],
      parserOptions,
      rules: {
        // TODO: re-lint everything once the migration is done
        'id-denylist': 'off',
        'id-length': 'off',
        'import/order': 'off',
        'import/unambiguous': 'off',
        'jsdoc/no-types': 'off',
        'n/no-unpublished-require': 'off',
        'no-undef': 'off',
      },
    },
    // @metamask/keyring-eth-simple
    {
      files: ['packages/keyring-eth-simple/src/**/*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
      rules: {
        // TODO: re-lint everything once the migration is done
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    // @metamask/keyring-eth-ledger-bridge
    {
      files: ['packages/keyring-eth-ledger-bridge/src/**/*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
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
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
      rules: {
        // TODO: re-lint everything once the migration is done
        '@typescript-eslint/no-explicit-any': 'off',
        'no-restricted-globals': 'off',
      },
    },
    // @metamask/keyring-eth-trezor
    {
      files: ['packages/keyring-eth-trezor/src/**/*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
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
        'import/order': 'off',
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
    // @metamask/keyring-snap
    {
      files: ['packages/keyring-snap/src/**/*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions,
      rules: {
        // TODO: re-lint everything once the migration is done
        '@typescript-eslint/no-explicit-any': 'off',
        // FIXME: for some reason, it seems eslint is not able to infere those (this
        // works on the original repository, so there might be some side-effects now that
        // we are building in a monorepo)
        '@typescript-eslint/restrict-template-expressions': 'off',
      },
    },
  ],
  rules: {
    'jsdoc/match-description': [
      'off',
      { matchDescription: '^[A-Z`\\d_][\\s\\S]*[.?!`>)}]$' },
    ],
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    jsdoc: {
      mode: 'typescript',
    },
  },
};
