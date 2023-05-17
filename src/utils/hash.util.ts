import * as crypto from 'crypto';

/**
 * sha256 hash
 */
export function sha256(str: string) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

/**
 * MD5 hash
 */
export function md5(text: string | Buffer): string {
  const hash = crypto.createHash('md5');
  hash.update(text);
  return hash.digest('hex');
}
