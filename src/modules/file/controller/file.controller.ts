import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from '../service/file.service';
import { UploadChunkDto, VerifyDto } from '../dtos';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 验证是否已经上传
   */
  @Post('verify')
  verify(@Body() verifyDto: VerifyDto) {
    return this.fileService.verify(verifyDto);
  }

  /**
   * 上传文件切片
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('chunk'))
  uploadChunk(
    @Body() uploadChunkDto: UploadChunkDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.fileService.uploadChunk(uploadChunkDto, file);
  }
}
