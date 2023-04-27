import { Module } from '@nestjs/common';
import { FileController } from './file/controller/file.controller';
import { FileService } from './file/service/file.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity, UserEntity } from '../../entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, FileEntity])],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
