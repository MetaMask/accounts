const path = require('path');
const webpack = require('webpack');

const config = require('./webpack.config');

/**
 * Build the webview bundle with webpack
 */
function buildWithWebpack() {
  console.log('Starting webpack build...');

  const compiler = webpack(config);

  compiler.run((error, stats) => {
    if (error) {
      console.error('Webpack build failed:', error);
      throw error;
    }

    if (stats.hasErrors()) {
      console.error('Webpack build completed with errors:');
      stats.compilation.errors.forEach((errorMessage) => {
        console.error(errorMessage);
      });
      throw new Error('Webpack build failed');
    }

    if (stats.hasWarnings()) {
      console.warn('Webpack build completed with warnings:');
      stats.compilation.warnings.forEach((warning) => {
        console.warn(warning);
      });
    }

    console.log('Webpack build completed successfully!');
    console.log('Output:', path.resolve(__dirname, 'index.webpack.bundle.js'));
    console.log(
      'Source Map:',
      path.resolve(__dirname, 'index.webpack.bundle.js.map'),
    );

    // Optional: Display build stats
    console.log('\nBuild Stats:');
    console.log(
      stats.toString({
        chunks: false,
        colors: true,
        modules: false,
      }),
    );
  });
}

// Run the build
buildWithWebpack();
