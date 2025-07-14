module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        // Android 10 was released in 2019
        targets: 'since 2019',
      },
    ],
    '@babel/preset-typescript',
    '@babel/preset-react',
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-transform-runtime',
  ],
  comments: false,
  compact: true,
};
