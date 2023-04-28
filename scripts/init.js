const path = require('path');
const fse = require('fs-extra');
const sqlite = require('sqlite3');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { execSync } = require('child_process');

dotenv.config({ path: path.join(__dirname, '../.env') });

const baseDir = path.join(__dirname, '..');

async function boostrap() {
  if (!process.env.DATABASE_DIR) {
    _printError('缺少环境变量 DATABASE_DIR ，请在 .env 文件中填写');
  }
  if (!process.env.USER_ACCOUNT) {
    _printError('缺少环境变量 USER_ACCOUNT ，请在 .env 文件中填写');
  }
  if (!process.env.USER_PWD) {
    _printError('缺少环境变量 USER_PWD ，请在 .env 文件中填写');
  }

  // 初始化数据库
  await handleDB();
  // 处理客户端
  await handleClient();
  console.log('初始化完成');
}

boostrap();

/**
 * 数据库的初始化处理
 */
async function handleDB() {
  _print('sqlite初始化处理...');
  const DATABASE_DIR = process.env.DATABASE_DIR;
  const USER_ACCOUNT = process.env.USER_ACCOUNT;
  const USER_PWD = process.env.USER_PWD;

  await fse.ensureDir(DATABASE_DIR);
  const dbPath = path.join(DATABASE_DIR, 'file.db');
  try {
    await fse.access(dbPath);
    await fse.rm(dbPath);
  } catch (e) {}

  const db = new sqlite.Database(dbPath);
  const initSQL = fse
    .readFileSync(path.join(__dirname, 'sql/init.sql'))
    .toString();
  db.exec(initSQL);

  const salt = crypto.randomUUID().slice(0, 8);
  db.prepare(
    `INSERT INTO tb_user(account, pwd, salt) 
    VALUES(?, ?, ?)`,
  ).run(USER_ACCOUNT, _md5(_md5(USER_PWD) + salt), salt);
  _printSuccess('sqlite初始化处理成功！');
}

/**
 * 客户端的初始化处理
 */
async function handleClient() {
  _print('前端初始化处理...');
  const clientDir = path.join(baseDir, 'client');
  execSync(`cd ${clientDir}`);
  execSync('npm ci');
  execSync('npm run build');
  _printSuccess('前端初始化成功！');
}

/**
 * 错误日志
 */
function _printError(message) {
  console.error('❌', new Error(message));
  process.exit(1);
}

/**
 * 日志
 */
function _print(message) {
  console.log('🚴', message);
}

/**
 * 成功日志
 */
function _printSuccess(message) {
  console.log('👌', message);
}

/**
 * MD5哈希函数
 * @private
 */
function _md5(text) {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
}
