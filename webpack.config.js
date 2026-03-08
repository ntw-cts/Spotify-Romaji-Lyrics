const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    content: './src/content.js',
    popup: './src/popup.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "src/manifest.json", to: "manifest.json" },
        { from: "src/popup.html", to: "popup.html" },
        // Copies the 15MB dictionary folder into the final extension build
        { from: "node_modules/kuromoji/dict", to: "dict" } 
      ],
    }),
  ],
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  }
};