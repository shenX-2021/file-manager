const path = require('path');
const fse = require('fs-extra');
const dotenv = require('dotenv');
const { printSuccess } = require('./libs/print');

dotenv.config(path.join(process.cwd(), '.env'));

async function boostrap() {
  console.log(process.env.UPLOAD_FILE_DIR, process.cwd());
  if (
    process.env.UPLOAD_FILE_DIR &&
    fse.existsSync(process.env.UPLOAD_FILE_DIR)
  ) {
    await fse.rm(process.env.UPLOAD_FILE_DIR, { recursive: true });
    printSuccess('删除文件保存目录成功！');
  }
  if (
    process.env.UPLOAD_CHUNK_DIR &&
    fse.existsSync(process.env.UPLOAD_CHUNK_DIR)
  ) {
    await fse.rm(process.env.UPLOAD_CHUNK_DIR, { recursive: true });
    printSuccess('删除chunk缓存目录成功！');
  }
  if (process.env.DATABASE_DIR && fse.existsSync(process.env.DATABASE_DIR)) {
    await fse.rm(process.env.DATABASE_DIR, { recursive: true });
    printSuccess('删除数据库目录成功！');
  }

  console.log('...');
  printSuccess('重置成功！');
}

boostrap();
