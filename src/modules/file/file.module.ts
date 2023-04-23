import { Module } from '@nestjs/common';
import { FileController } from './controller/file.controller';
import { FileService } from './service/file.service';

@Module({
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
