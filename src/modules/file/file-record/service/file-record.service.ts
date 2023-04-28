import { BadRequestException, Injectable } from '@nestjs/common';
import { ChangeFilenameDto, ListDto } from '../dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../../../../entities';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { isDefined } from 'class-validator';
import * as fse from 'fs-extra';
import { FileCheckStatusEnum } from '../../../../enums';
import { FileService } from '../../file/service/file.service';
import { md5 } from '../../../../utils';
import { CheckRo, ListRo } from '../ros';

@Injectable()
export class FileRecordService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileEntityRepository: Repository<FileEntity>,
  ) {}

  /**
   * 获取文件记录列表
   */
  async list(listDto: ListDto): Promise<ListRo> {
    const { pageNumber, pageSize, filename } = listDto;

    const where: FindOptionsWhere<FileEntity> = {};

    if (isDefined(filename) && filename.length > 0) {
      where.filename = ILike(`%${filename}%`);
    }

    const [list, total] = await this.fileEntityRepository.findAndCount({
      where: where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
    });

    return {
      pageNumber,
      pageSize,
      total,
      list,
    };
  }

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

  /**
   * 校验文件
   */
  async check(id: number): Promise<CheckRo> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException(`文件【id: ${id}】不存在`);
    }

    const { startHash, endHash, size, filePath } = fileEntity;
    let fileStat: fse.Stats;
    try {
      fileStat = await fse.stat(filePath);
    } catch (e) {
      console.error('获取文件信息报错:', e);
      throw new BadRequestException(`文件【id: ${id}】源文件已丢失`);
    }
    if (fileStat.size !== size) {
      await this.updateCheckStatus(fileEntity, FileCheckStatusEnum.FAILURE);
      return {
        checkStatus: FileCheckStatusEnum.FAILURE,
      };
    }
    const length =
      FileService.CHUNK_MAX_SIZE > size ? size : FileService.CHUNK_MAX_SIZE;
    // 校验文件起始部分的hash值
    const startBuffer = await this.getChunk(filePath, 0, length - 1);
    const startBufferHash = md5(startBuffer);
    if (startBufferHash !== startHash) {
      await this.updateCheckStatus(fileEntity, FileCheckStatusEnum.FAILURE);
      return {
        checkStatus: FileCheckStatusEnum.FAILURE,
      };
    }
    // 校验文件末尾部分的hash值
    const endBuffer = await this.getChunk(filePath, size - length, size);
    const endBufferHash = md5(endBuffer);
    if (endBufferHash !== endHash) {
      await this.updateCheckStatus(fileEntity, FileCheckStatusEnum.FAILURE);
      return {
        checkStatus: FileCheckStatusEnum.FAILURE,
      };
    }

    // 更新状态为校验成功
    await this.updateCheckStatus(fileEntity, FileCheckStatusEnum.SUCCESSFUL);
    return {
      checkStatus: FileCheckStatusEnum.SUCCESSFUL,
    };
  }

  /**
   * 更新数据库的文件记录的校验状态
   */
  private async updateCheckStatus(
    fileEntity: FileEntity,
    checkStatus: FileCheckStatusEnum,
  ) {
    if (fileEntity.checkStatus !== checkStatus) {
      fileEntity.checkStatus = checkStatus;
      await fileEntity.save();
    }
  }

  private getChunk(
    filePath: string,
    start: number,
    end: number,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const readStream = fse.createReadStream(filePath, {
        start,
        end: end,
      });
      const buffers = [];
      readStream.on('data', (chunk) => {
        buffers.push(chunk);
      });
      readStream.on('end', () => {
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });
      readStream.on('error', (e) => reject(e));
      readStream.read();
    });
  }
}
