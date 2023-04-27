import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ChangeFilenameDto } from '../../file/dtos';
import { FileRecordService } from '../service/file-record.service';

@Controller('file/record')
export class FileRecordController {
  constructor(private readonly fileRecordService: FileRecordService) {}

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
}
