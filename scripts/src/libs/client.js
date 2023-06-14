const path = require('path');
const { execSync } = require('child_process');
const { printSuccess, print } = require('./print');

const baseDir = path.join(__dirname, '../../');

/**
 * 客户端的依赖安装
 */
async function clientInstall() {
  print('前端代码依赖安装中...');
  const clientDir = path.join(baseDir, 'client');
  execSync(`cd ${clientDir} && npm ci`);
  printSuccess('前端代码依赖成功！');
}

/**
 * 客户端的代码构建
 */
async function clientBuild() {
  print('前端代码构建中...');
  const clientDir = path.join(baseDir, 'client');
  execSync(`cd ${clientDir} && npm build`);
  printSuccess('前端代码构建成功！');
}

module.exports = {
  clientInstall,
  clientBuild,
};
