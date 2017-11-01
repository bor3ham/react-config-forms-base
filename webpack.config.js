var path = require('path');
var NodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/config-forms.js',
  output: {
    path: __dirname + '/dist',
    filename: 'react-config-forms-base.js',
    library: 'react-config-forms-base',
    libraryTarget: 'umd',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel',
        query: {
          presets: [
            'react',
            'es2015',
            'stage-0',
          ],
        },
      },
    ],
  },
  externals: NodeExternals(),
};
