const path = require('path');
const fse = require('fs-extra');
const { execSync } = require('child_process');
const sqlite = require('sqlite3');
const dotenv = require('dotenv');
const crypto = require('crypto');
const { printSuccess, print, printError } = require('./libs/print');

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
  if (!process.env.USER_ACCOUNT) {
    printError('缺少环境变量 USER_ACCOUNT ，请在 .env 文件中填写');
  }
  if (!process.env.USER_PWD) {
    printError('缺少环境变量 USER_PWD ，请在 .env 文件中填写');
  }

  try {
    await fse.access('./init.lock');
    printError('已经初始化过了，无需重复初始化');
  } catch (e) {}

  // 初始化数据库
  await handleDB();

  execSync('touch init.lock');

  console.log('...\n');
  printSuccess('初始化完成，可执行 `npm run build` 构建代码！');
}

boostrap();

/**
 * 数据库的初始化处理
 */
async function handleDB() {
  return new Promise(async (resolve, reject) => {
    print('sqlite初始化处理...');
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
    await db
      .prepare(
        `INSERT INTO tb_user(account, pwd, salt) 
    VALUES(?, ?, ?)`,
      )
      .run([USER_ACCOUNT, _md5(_md5(USER_PWD) + salt), salt], (err) => {
        if (err) {
          return reject(err);
        }

        printSuccess('sqlite初始化处理成功！');
        resolve();
      });
  });
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
