module.exports = {
  extends: ['../../.eslintrc.js'],

  overrides: [
    {
      files: ['*.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      rules: {
        'import/no-nodejs-modules': ['error', { allow: ['buffer', 'crypto'] }],
      },
    },
  ],

  ignorePatterns: ['!.eslintrc.js', 'dist/'],
};
