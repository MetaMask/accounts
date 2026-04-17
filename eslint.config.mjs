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

]);

export default config;
