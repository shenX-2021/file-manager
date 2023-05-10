import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from '../service/file.service';
import { MergeChunkDto, UploadChunkDto, VerifyDto } from '../dtos';
import { Request } from 'express';

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
  @UseInterceptors()
  async uploadChunk(
    @Query() uploadChunkDto: UploadChunkDto,
    @Req() req: Request,
  ) {
    return this.fileService.uploadChunk(uploadChunkDto, req);
  }

  /**
   * 合并文件切片
   */
  @Post('merge')
  mergeChunk(@Body() mergeChunkDto: MergeChunkDto) {
    return this.fileService.mergeChunk(mergeChunkDto);
  }

  /**
   * 取消合并文件切片
   */
  @Patch('merge/cancel/:id')
  cancelMerge(@Param('id', ParseIntPipe) id: number) {
    return this.fileService.cancelMerge(id);
  }

  /**
   * 下载文件
   */
  @Get('download/:id')
  download(@Param('id', ParseIntPipe) id: number) {
    return this.fileService.download(id);
  }
}
