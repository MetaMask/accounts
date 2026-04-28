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

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.[jt]s?(x)'],

  // gridplus-sdk (a transitive dep of eth-lattice-keyring) nests uuid@13 which
  // is ESM-only and has no `require` export condition. Redirect all `uuid`
  // imports to the root-level uuid@9, which is CJS-compatible and exposes the
  // same API (v4, etc.) that gridplus-sdk uses.
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },
});
