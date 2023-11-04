const path = require('path');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { printSuccess, print, printError } = require('./libs/print');
const { Database } = require('./libs/database');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function boostrap() {
  if (!process.env.UPLOAD_FILE_DIR) {
    printError('缺少环境变量 UPLOAD_FILE_DIR ，请在 .env 文件中填写');
  }
  if (!process.env.UPLOAD_CHUNK_DIR) {
    printError('缺少环境变量 UPLOAD_CHUNK_DIR ，请在 .env 文件中填写');
  }
  if (!process.env.DATABASE_DIR) {
    printError('缺少环境变量 DATABASE_DIR ，请在 .env 文件中填写');
  }

  // 初始化数据库
  await handleDB();

  console.log('...\n');
  printSuccess('初始化完成！');
}

boostrap();

/**
 * 数据库的初始化处理
 */
async function handleDB() {
  print('sqlite初始化处理...');
  const DATABASE_DIR = process.env.DATABASE_DIR;

  await fse.ensureDir(DATABASE_DIR);
  const dbPath = path.join(DATABASE_DIR, 'file.db');

  const isInit = await fse
    .access(dbPath)
    .then(() => true)
    .catch(() => false);
  if (!isInit) {
    const db = new Database(dbPath);
    await db.init();
    printSuccess('sqlite初始化处理成功！');
  } else {
    printSuccess('sqlite已经初始化，无需初始化！');
  }
}

/**
 * MD5哈希函数
 * @private
 */
function _sha256(text) {
  const hash = crypto.createHash('sha256');
  hash.update(text);
  return hash.digest('hex');
}
