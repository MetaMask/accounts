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

  // A preset that is used as a base for Jest's configuration
  preset: 'ts-jest/presets/js-with-ts',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: ['./test'],

  // The glob patterns Jest uses to detect test files
  testMatch: ['**/test/**/*.[jt]s?(x)'],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 84,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
});
