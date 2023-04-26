import * as path from 'path';
import * as process from 'process';

// 上传的文件存放目录
export const UPLOAD_FILE_DIR =
  process.env.UPLOAD_FILE_DIR || path.join(__dirname, '../../target', 'files');

// 上传的文件切片存放目录
export const UPLOAD_CHUNK_DIR =
  process.env.UPLOAD_CHUNK_DIR ||
  path.join(__dirname, '../../target', 'chunks');
// sqlite数据库文件存放目录
export const DATABASE_DIR =
  process.env.DATABASE_DIR || path.join(__dirname, '../../target', 'db');
