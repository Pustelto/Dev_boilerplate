var webpack = require('webpack');
var path = require('path');

module.exports = {
  entry: {
    main: './src/js/main.js',
    modernizr: './src/js/modernizr-custom.js'
  },
  output: {
    filename: '[name].js',
    path: './dist/js/',
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
    ]
  },
  plugins: [
    new webpack.optimize.UglifyJsPlugin({minimize: true})
  ],
  resolveLoader: {
    root: path.resolve(__dirname, 'node_modules')
  },
  devtool: 'source-map',
};
