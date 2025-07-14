/* eslint-disable n/no-sync */
const fs = require('fs');
const path = require('path');

const outputPath = path.resolve(__dirname, 'srcWebview');

class InlineHtmlPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('InlineHtmlPlugin', () => {
      // Read the generated bundle
      const bundlePath = path.join(outputPath, 'bundle.js');
      const bundleContent = fs.readFileSync(bundlePath, 'utf8');

      // Create HTML with inlined script
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>MetaMask WebView</title>
</head>
<body>
  <div id="root"></div>
  <script>${bundleContent}</script>
</body>
</html>`;

      // Write everything to single HTML file
      fs.writeFileSync(
        path.join(outputPath, 'webviewCrypto.html'),
        htmlContent,
      );

      // Remove the separate bundle file
      fs.unlinkSync(path.join(outputPath, 'bundle.js'));
      fs.unlinkSync(path.join(outputPath, 'bundle.js.LICENSE.txt'));
    });
  }
}

module.exports = {
  mode: 'production',
  entry: './srcWebview/webviewSource.ts',
  output: {
    filename: 'bundle.js',
    path: outputPath,
    clean: false,
  },
  optimization: {
    usedExports: true,
    sideEffects: false,
    minimize: true,
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)$/u,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: path.resolve(__dirname, 'babel.config.js'),
          },
        },
        exclude: /node_modules/u,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [new InlineHtmlPlugin()],
  devtool: false,
};
