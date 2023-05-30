const path = require('path');

function getExternals() {
  return [
    function ({ context, request }, callback) {
      const list = [
        '@mapbox/node-pre-gyp',
        'node-gyp',
        'sqlite3',
        '@nestjs/microservices',
        '@nestjs/microservices/microservices-module',
        '@nestjs/platform-socket.io',
        '@fastify/static',
        'cache-manager',
      ];
      if (list.includes(request)) {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    },
  ];
}

module.exports = {
  entry: './src/main',
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
  // ts文件的处理
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: {
          loader: 'ts-loader',
          options: { transpileOnly: false },
        },
        exclude: /node_modules/,
      },
    ],
  },
  // 打包后的文件名称以及位置
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
    },
  },
};
