import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from '../service/file.service';
import {
  ChangeFilenameDto,
  MergeChunkDto,
  UploadChunkDto,
  VerifyDto,
} from '../dtos';
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

  /**
   * 合并文件切片
   */
  @Post('merge')
  mergeChunk(@Body() mergeChunkDto: MergeChunkDto) {
    return this.fileService.mergeChunk(mergeChunkDto);
  }

  /**
   * 修改文件名
   */
  @Patch('filename/:id')
  changeFileName(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeFilenameDto: ChangeFilenameDto,
  ) {
    return this.fileService.changeFileName(id, changeFilenameDto);
  }
}
