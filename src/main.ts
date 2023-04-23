import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

const port = 8888;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
