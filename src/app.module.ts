import { Module } from '@nestjs/common';
import { FileModule } from './modules/file/file.module';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    FileModule,
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'target/db/file.db',
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      extra: {
        fileMustExist: true,
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
