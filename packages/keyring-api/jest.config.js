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

  coveragePathIgnorePatterns: ['./src/tests'],

  // An object that configures minimum threshold enforcement for coverage results
  // Note: keyring-type.ts and keyring-capabilities.ts in src/api/v2/ are
  // excluded from the main barrel (v2 is now a separate subpath export) and
  // have no direct tests, which lowers overall coverage from 100%.
  coverageThreshold: {
    global: {
      branches: 96,
      functions: 96.55,
      lines: 96.15,
      statements: 96.15,
    },
  },
});
