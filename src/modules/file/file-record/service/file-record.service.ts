import { BadRequestException, Injectable } from '@nestjs/common';
import {
  ChangeFilenameDto,
  DetailByPropDto,
  ListDto,
  UpdateOutsideDownloadDto,
} from '../dtos';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../../../../entities';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { isDefined } from 'class-validator';
import * as fse from 'fs-extra';
import { FileCheckStatusEnum, FileStatusEnum } from '../../../../enums';
import { FileService } from '../../file/service/file.service';
import { md5 } from '../../../../utils';
import { CheckRo, ListRo } from '../ros';

@Injectable()
export class FileRecordService {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileEntityRepository: Repository<FileEntity>,
    private readonly fileService: FileService,
  ) {}

  /**
   * 获取文件记录列表
   */
  async list(listDto: ListDto): Promise<ListRo> {
    const { pageNumber, pageSize, filename } = listDto;

    const where: FindOptionsWhere<FileEntity> = {
      status: Not(In([FileStatusEnum.INIT, FileStatusEnum.CHUNK_UPLOADING])),
    };

    if (isDefined(filename) && filename.length > 0) {
      where.filename = ILike(`%${filename}%`);
    }

    const [list, total] = await this.fileEntityRepository.findAndCount({
      where: where,
      skip: (pageNumber - 1) * pageSize,
      take: pageSize,
      order: {
        id: 'DESC',
      },
    });

    return {
      pageNumber,
      pageSize,
      total,
      list,
    };
  }

  /**
   * 通过id查找文件记录信息
   */
  async detail(id: number): Promise<FileEntity> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException(`文件记录【id: ${id}】不存在`);
    }

    return fileEntity;
  }

  /**
   * 通过文件属性查找文件记录信息
   */
  async detailByProp(detailByPropDto: DetailByPropDto): Promise<FileEntity> {
    const { startHash, endHash, size } = detailByPropDto;

    return await this.fileEntityRepository.findOneBy({
      startHash,
      endHash,
      size,
    });
  }

  /**
   * 删除文件记录
   */
  async del(id: number): Promise<void> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException(`文件记录【id: ${id}】不存在`);
    }

    // 文件已合并完成，则需要删除文件
    if (fileEntity.status === FileStatusEnum.FINISHED) {
      await fse.rm(fileEntity.filePath).catch((e) => {
        console.error(`移除文件【id: ${id}】报错`, e);
      });
    }

    // 文件切片正在上传中，则需要删除切片目录 TODO: 停止切片上传
    if (
      [FileStatusEnum.CHUNK_UPLOADING, FileStatusEnum.CHUNK_UPLOADED].includes(
        fileEntity.status,
      )
    ) {
      const chunkDir = this.fileService.getChunkDir(fileEntity.fileHash);
      await fse.remove(chunkDir).catch((e) => {
        console.error(`移除切片目录【id: ${id}】报错`, e);
      });
    }

    // TODO: 切片正在合并的状态的处理

    await this.fileEntityRepository.remove(fileEntity);
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
      throw new BadRequestException('文件不存在，修改文件名称失败');
    }

    if (fileEntity.filename !== filename) {
      fileEntity.filename = filename;
      await fileEntity.save();
    }
  }

  /**
   * 校验文件
   */
  async check(id: number): Promise<CheckRo> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException(`文件【id: ${id}】不存在`);
    }

    const { startHash, endHash, size, filePath, status } = fileEntity;

    if (status !== FileStatusEnum.FINISHED) {
      throw new BadRequestException('文件尚未完成上传，无法校验');
    }

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
   * 更新外部下载的启用状态
   */
  async updateOutsideDownload(
    id: number,
    updateOutsideDownloadDto: UpdateOutsideDownloadDto,
  ): Promise<void> {
    const { outsideDownload } = updateOutsideDownloadDto;
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException('文件不存在，更新外部下载状态失败');
    }

    if (fileEntity.outsideDownload !== outsideDownload) {
      fileEntity.outsideDownload = outsideDownload;
      await fileEntity.save();
    }
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
