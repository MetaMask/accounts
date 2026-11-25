import type { Config } from 'jest';

// The shared Jest configuration is CommonJS and has no type declarations.
// eslint-disable-next-line @typescript-eslint/no-require-imports, no-restricted-globals
const baseConfig = require('../../jest.config.packages') as Config;

const config: Config = {
  ...baseConfig,
  displayName: 'key-derivation-purposes',
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};

export default config;
