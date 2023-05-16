import { Module } from '@nestjs/common';
import { FileModule } from './modules/file/file.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { DATABASE_DIR } from './config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SharedModule } from './modules/shared/shared.module';
import { AppModule as AppCtrModule } from './modules/app/app.module';

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
      serveStaticOptions: {
        etag: true,
      },
    }),
    SharedModule,
    AppCtrModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
