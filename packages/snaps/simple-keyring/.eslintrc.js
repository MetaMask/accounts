module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: ['@metamask/eslint-config-typescript'],
      rules: {
        // This prevents using Node.js and/or browser specific globals. We
        // currently use both in our codebase, so this rule is disabled.
        'no-restricted-globals': 'off',
        'spaced-comment': ['error', 'always', { markers: ['/'] }],
      },
    },

    {
      files: ['*.js', '*.jsx', '*.cjs'],
      extends: ['@metamask/eslint-config-nodejs'],
    },

    {
      files: ['*.test.ts', '*.test.js'],
      extends: [
        '@metamask/eslint-config-jest',
        '@metamask/eslint-config-nodejs',
      ],
    },
  ],

  rules: {
    // This is necessary to run eslint on Windows and not get a thousand CRLF errors
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
  },

  ignorePatterns: [
    '!.eslintrc.js',
    '!.prettierrc.js',
    'dist/',
    'docs/',
    '.yarn/',
  ],
};
