import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as fse from 'fs-extra';
import { FileService } from './modules/file/file/service/file.service';

const port = 8888;

async function bootstrap() {
  // 建立上传目录
  await fse.ensureDir(FileService.UPLOAD_DIR);

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
