const path = require('path');

module.exports = {
  entry: './public/javascript/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public/javascript/dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
