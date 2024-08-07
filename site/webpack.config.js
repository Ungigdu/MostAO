const webpack = require('webpack');
const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      fs: false,
      net: false,
      tls: false,
      zlib: false,
      "child_process": false,
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "assert": require.resolve("assert"),
      "url": require.resolve("url"),
      "process": require.resolve("process/browser.js")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser.js'
    })
  ]
};
