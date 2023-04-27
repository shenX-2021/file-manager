import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ChangeFilenameDto, ListDto } from '../dtos';
import { FileRecordService } from '../service/file-record.service';

@Controller('file/record')
export class FileRecordController {
  constructor(private readonly fileRecordService: FileRecordService) {}

  /**
   * 获取文件记录列表
   */
  @Get('list')
  mergeChunk(@Query() listDto: ListDto) {
    return this.fileRecordService.list(listDto);
  }

  /**
   * 修改文件名
   */
  @Patch('filename/:id')
  changeFileName(
    @Param('id', ParseIntPipe) id: number,
    @Body() changeFilenameDto: ChangeFilenameDto,
  ) {
    return this.fileRecordService.changeFileName(id, changeFilenameDto);
  }

  /**
   * 校验文件
   */
  @Patch('check/:id')
  check(@Param('id', ParseIntPipe) id: number) {
    return this.fileRecordService.check(id);
  }
}
