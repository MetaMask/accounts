/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */

const merge = require('deepmerge');
const path = require('path');

const baseConfig = require('../../jest.config.packages');

const displayName = path.basename(__dirname);

module.exports = merge(baseConfig, {
  // The display name when running multiple projects
  displayName,

  // Source files use Node16-style `.js` specifiers. Map them back to the
  // TypeScript sources so Jest can load the modules under test.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },

  // `@metamask/cryptography` is ESM-only. Transform it so Jest's CommonJS
  // runtime can load the AES-GCM helpers.
  transformIgnorePatterns: ['/node_modules/(?!@metamask/cryptography/)'],
  transform: {
    '/@metamask/cryptography/.+\\.js$': path.join(
      __dirname,
      'jest.cryptography-transform.cjs',
    ),
  },

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['./src/tests'],

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.[jt]s?(x)'],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
});
