import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fse from 'fs-extra';
import { COOKIE_SECRET, UPLOAD_CHUNK_DIR, UPLOAD_FILE_DIR } from './config';
import * as process from 'process';
import { WsAdapter } from './adapters';
import * as cookieParser from 'cookie-parser';

const port = 8888;

async function bootstrap() {
  // // 建立上传目录
  await fse.ensureDir(UPLOAD_FILE_DIR);
  await fse.ensureDir(UPLOAD_CHUNK_DIR);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/fm/api');
  app.useWebSocketAdapter(new WsAdapter(app));
  app.use(cookieParser(COOKIE_SECRET));
  // 全局使用管道(数据校验)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.debug('Listening port', port);
}
bootstrap();

process.on('uncaughtException', (e) => {
  if (e.message === 'ENOSPC: no space left on device, write') {
    // TODO: 可以做邮件提醒
    console.error('磁盘空间不足错误:', e);
  }

  if (e.message === 'file closed') {
    // TODO: 可以做邮件提醒
    console.error('文件句柄已关闭，还在处理使用句柄导致的错误:', e);
  }

  console.error('未被捕获的错误:', e);

  process.exit(1);
});
