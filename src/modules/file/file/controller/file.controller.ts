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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileService } from '../service/file.service';
import { MergeChunkDto, UploadChunkDto, VerifyDto } from '../dtos';
import { Request } from 'express';
import { AuthGuard } from '@src/guards/auth/auth.guard';
import { Throttle } from '@nestjs/throttler';
import { SkipAuth } from '@src/decorators';

@UseGuards(AuthGuard)
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
  @Throttle({
    default: {
      ttl: 60,
      limit: 10,
    },
  })
  @Get('download/:id')
  download(@Param('id', ParseIntPipe) id: number) {
    return this.fileService.download(id);
  }

  /**
   * 外部下载文件（无需鉴权）
   */
  @SkipAuth()
  @Throttle({
    default: {
      ttl: 60,
      limit: 10,
    },
  })
  @Get('out/:filename')
  outsideDownload(@Param('filename') filename: string) {
    return this.fileService.outsideDownload(filename);
  }
}
