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

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['./src/tests'],

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/*.test.[jt]s?(x)'],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 90.97,
      functions: 96,
      lines: 95.03,
      statements: 95.09,
    },
  },
});
