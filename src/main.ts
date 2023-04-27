import * as dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fse from 'fs-extra';
import { UPLOAD_CHUNK_DIR, UPLOAD_FILE_DIR } from './config';

const port = 8888;

async function bootstrap() {
  // // 建立上传目录
  await fse.ensureDir(UPLOAD_FILE_DIR);
  await fse.ensureDir(UPLOAD_CHUNK_DIR);
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/fm');
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
