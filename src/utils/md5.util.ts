import * as crypto from 'crypto';

/**
 * MD5加密
 */
export function md5(text: string | Buffer): string {
  const hash = crypto.createHash('md5');
  hash.update(text);
  return hash.digest('hex');
}
