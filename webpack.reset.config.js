const path = require('path');

module.exports = {
  entry: './scripts/src/reset.js',
  mode: 'production',
  node: {
    global: true,
    __filename: true,
    __dirname: true,
  },
  target: 'node',
  optimization: {
    minimize: true,
  },
  devtool: 'source-map',
  // 打包后的文件名称以及位置
  output: {
    filename: 'reset.js',
    path: path.resolve(__dirname, 'scripts/dist'),
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
};
