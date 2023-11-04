const path = require('path');

function getExternals() {
  return [
    function ({ context, request }, callback) {
      const list = ['@mapbox/node-pre-gyp', 'node-gyp', 'sqlite3'];
      if (list.includes(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ];
}

module.exports = {
  entry: './scripts/src/init.js',
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
  externals: getExternals(),
  devtool: 'source-map',
  // 打包后的文件名称以及位置
  output: {
    filename: 'init.js',
    path: path.resolve(__dirname, 'scripts/dist'),
  },
  resolve: {
    extensions: ['.js', '.json'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
};
