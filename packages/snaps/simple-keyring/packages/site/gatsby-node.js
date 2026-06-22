const webpack = require('webpack');

module.exports.onCreateWebpackConfig = ({ actions }) => {
  actions.setWebpackConfig({
    plugins: [
      new webpack.NormalModuleReplacementPlugin(/node:/u, (resource) => {
        const mod = resource.request.replace(/^node:/u, '');
        switch (mod) {
          case 'crypto':
            resource.request = 'crypto';
            break;
          default:
            throw new Error(`Not found ${mod}`);
        }
      }),
    ],
    resolve: {
      alias: {
        crypto: require.resolve('crypto-browserify'),
      },
      fallback: {
        crypto: require.resolve('crypto-browserify'),
      },
    },
  });
};
