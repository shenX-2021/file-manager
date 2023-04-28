import { Module } from '@nestjs/common';
import { FileModule } from './modules/file/file.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { DATABASE_DIR } from './config';
import { ServeStaticModule } from '@nestjs/serve-static';

@Module({
  imports: [
    FileModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: path.join(DATABASE_DIR, 'file.db'),
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      extra: {
        fileMustExist: true,
      },
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', 'client/dist'),
      exclude: ['/fm/api/*'],
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
