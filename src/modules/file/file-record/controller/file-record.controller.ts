import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ChangeFilenameDto, DetailByPropDto, ListDto } from '../dtos';
import { FileRecordService } from '../service/file-record.service';

@Controller('file/record')
export class FileRecordController {
  constructor(private readonly fileRecordService: FileRecordService) {}

  /**
   * 获取文件记录列表
   */
  @Get('list')
  list(@Query() listDto: ListDto) {
    return this.fileRecordService.list(listDto);
  }

  /**
   * 通过文件属性查找文件记录信息
   */
  @Get('detail/by-prop')
  detailByProp(@Query() detailByPropDto: DetailByPropDto) {
    return this.fileRecordService.detailByProp(detailByPropDto);
  }

  /**
   * 通过id查找文件记录信息
   */
  @Get('detail/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.fileRecordService.detail(id);
  }

  /**
   * 通过id删除文件记录
   */
  @Delete(':id')
  del(@Param('id', ParseIntPipe) id: number) {
    return this.fileRecordService.del(id);
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
