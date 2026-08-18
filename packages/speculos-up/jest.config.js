/** @type {import('ts-jest').JestConfigWithTsJest} */
const merge = require('deepmerge');
const path = require('path');
const baseConfig = require('../../jest.config.packages');

module.exports = merge(
  baseConfig,
  {
    displayName: path.basename(__dirname),
    // Unlike the base config, index.ts contains real (security-relevant)
    // logic in this package, so its coverage is collected.
    coveragePathIgnorePatterns: [],
    coverageThreshold: {
      global: { branches: 10, functions: 20, lines: 20, statements: 20 },
    },
  },
  // Replace base-config arrays (such as coveragePathIgnorePatterns) instead
  // of concatenating them.
  { arrayMerge: (_destinationArray, sourceArray) => sourceArray },
);
