const merge = require('deepmerge');
const path = require('path');
const baseConfig = require('../../jest.config.packages');

module.exports = merge(baseConfig, {
  displayName: path.basename(__dirname),
  // Spike directories contain browser-context scripts named `test.js` that
  // Jest's default testMatch would otherwise pick up as test suites.
  testPathIgnorePatterns: ['/node_modules/', '/spike/'],
  coverageThreshold: {
    global: { branches: 10, functions: 20, lines: 20, statements: 20 },
  },
});
