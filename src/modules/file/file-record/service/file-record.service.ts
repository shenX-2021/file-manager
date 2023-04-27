import { BadRequestException, Injectable } from '@nestjs/common';
import { ChangeFilenameDto } from '../../file/dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../../../../entities';
import { Repository } from 'typeorm';

@Injectable()
export class FileRecordService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileEntityRepository: Repository<FileEntity>,
  ) {}

  /**
   * 修改文件名
   */
  async changeFileName(
    id: number,
    changeFilenameDto: ChangeFilenameDto,
  ): Promise<void> {
    const { filename } = changeFilenameDto;
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException('文件不存在，修改文件失败');
    }

    fileEntity.filename = filename;
    await fileEntity.save();
  }
}
