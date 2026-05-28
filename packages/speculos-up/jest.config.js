const merge = require('deepmerge');
const path = require('path');
const baseConfig = require('../../jest.config.packages');
module.exports = merge(baseConfig, {
  displayName: path.basename(__dirname),
  coverageThreshold: { global: { branches: 25, functions: 35, lines: 40, statements: 40 } },
});
