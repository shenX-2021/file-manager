import { Module } from '@nestjs/common';
import { FileController } from './file/controller/file.controller';
import { FileService } from './file/service/file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity, UserEntity } from '../../entities';
import { FileRecordController } from './file-record/controller/file-record.controller';
import { FileRecordService } from './file-record/service/file-record.service';
import { UploadGateway } from './gateway/upload/upload.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, FileEntity])],
  controllers: [FileController, FileRecordController],
  providers: [FileService, FileRecordService, UploadGateway],
})
export class FileModule {}
