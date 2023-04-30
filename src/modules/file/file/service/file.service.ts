import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { MergeChunkDto, UploadChunkDto, VerifyDto } from '../dtos';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as fsp from 'fs/promises';
import checkDiskSpace from 'check-disk-space';
import { VerifyRo } from '../ros';
import * as pLimit from 'p-limit';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../../../../entities';
import { Repository } from 'typeorm';
import { FileCheckStatusEnum, FileStatusEnum } from '../../../../enums';
import { UPLOAD_CHUNK_DIR, UPLOAD_FILE_DIR } from '../../../../config';

@Injectable()
export class FileService {
  static CHUNK_MAX_SIZE = 30 * 1024 * 1024;

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileEntityRepository: Repository<FileEntity>,
  ) {}

  /**
   * 验证是否已经上传
   */
  async verify(verifyDto: VerifyDto): Promise<VerifyRo> {
    const { filename, fileHash, size, startHash, endHash } = verifyDto;
    const filePath = this.getFilePath(fileHash);

    let fileEntity = await this.fileEntityRepository.findOneBy({ fileHash });
    if (!fileEntity) {
      fileEntity = await this.fileEntityRepository
        .create({
          filename,
          fileHash,
          startHash,
          endHash,
          filePath,
          size,
          status: FileStatusEnum.INIT,
          checkStatus: FileCheckStatusEnum.UNCHECKED,
        })
        .save();
    }

    // 文件名不同，需要用户判断是否更改名字
    if (fileEntity.filename !== filename) {
      return {
        code: 1,
        message: '文件名不同，是否要修改',
        data: {
          id: fileEntity.id,
          originFileName: fileEntity.filename,
        },
      };
    }
    // 文件记录状态为已完成，无需重复上传
    if (fileEntity.status === FileStatusEnum.FINISHED) {
      return {
        code: 0,
        data: {
          needUpload: false,
        },
      };
    }

    try {
      const fileStat = await fse.stat(filePath);

      if (fileStat.size === size) {
        // 大小相同，则认为是文件一致，无需重复上传
        fileEntity.status = FileStatusEnum.FINISHED;
        await fileEntity.save();

        return {
          code: 0,
          data: {
            needUpload: false,
          },
        };
      } else {
        // 大小不同，移除已上传的文件
        await fse.rm(filePath);
      }
    } catch (e) {
      // do nothing
    }
    // 通过文件大小计算切片数量
    const chunkCount = Math.ceil(size / FileService.CHUNK_MAX_SIZE);

    // 检查目录下所有切片
    const chunkDir = this.getChunkDir(fileHash);
    let uploadedList: string[] = [];
    if (await fse.exists(chunkDir)) {
      const chunkNames = await fse.readdir(chunkDir);
      for (const chunkName of chunkNames) {
        // 切片不为最后一块
        if (chunkName !== (chunkCount - 1).toString()) {
          // 检查大小是否正常
          try {
            const chunkPath = path.join(chunkDir, chunkName);
            const chunkStat = await fse.stat(chunkPath);
            // 大小和切片最大的大小不一致，移除切片
            if (chunkStat.size !== FileService.CHUNK_MAX_SIZE) {
              await fse.rm(chunkPath);
            }
          } catch (e) {
            // do nothing
          }
        }
      }
      // 获取已上传的切片列表
      uploadedList = await fse.readdir(chunkDir);
      // 当切片已全部合并完成，将记录状态改为已上传切片
      if (uploadedList.length === chunkCount) {
        fileEntity.status = FileStatusEnum.CHUNK_UPLOADED;
        await fileEntity.save();
      }
    }

    if (fileEntity.status === FileStatusEnum.INIT) {
      fileEntity.status = FileStatusEnum.CHUNK_UPLOADING;
      await fileEntity.save();
    }

    return {
      code: 0,
      data: {
        needUpload: true,
        uploadedList,
      },
    };
  }

  /**
   * 上传文件切片
   */
  async uploadChunk(uploadChunkDto: UploadChunkDto, file: Express.Multer.File) {
    const { fileHash, chunkIndex, size } = uploadChunkDto;

    const filePath = this.getFilePath(fileHash);
    const chunkDir = this.getChunkDir(fileHash);

    await fse.ensureDir(chunkDir);
    const chunkPath = path.join(chunkDir, chunkIndex.toString());

    // 文件已上传
    if (await fse.exists(filePath)) {
      return {
        status: 0,
      };
    }
    // 检查切片状态
    try {
      const chunkStat = await fse.stat(chunkPath);

      const chunkCount = Math.ceil(size / FileService.CHUNK_MAX_SIZE);
      if (
        chunkIndex === chunkCount - 1 ||
        chunkStat.size === FileService.CHUNK_MAX_SIZE
      ) {
        // 最后一块切片 或大小等于最大切片长度，则认为是切片一致，无需重复上传
        return {
          status: 1,
        };
      } else {
        // 大小不同，移除已上传的切片
        await fse.rm(chunkPath);
      }
    } catch (e) {
      // do nothing
    }

    await fse.writeFile(chunkPath, file.buffer, { flag: 'wx' });
    return {
      status: 1,
    };
  }

  /**
   * 合并文件切片
   */
  async mergeChunk(mergeChunkDto: MergeChunkDto): Promise<void> {
    const { fileHash, size } = mergeChunkDto;

    const fileEntity = await this.fileEntityRepository.findOneBy({ fileHash });
    if (!fileEntity) {
      throw new BadRequestException('文件记录不存在，无法合并切片');
    }
    if (fileEntity.status !== FileStatusEnum.CHUNK_UPLOADED) {
      throw new BadRequestException('文件记录的状态不正确');
    }

    if (!fileEntity.filePath) {
      fileEntity.filePath = this.getFilePath(fileHash);
    }

    const filePath = fileEntity.filePath;
    const chunkDir = this.getChunkDir(fileHash);

    // 所需磁盘空间，为合并成功，留100M冗余。
    let needDiskSize = fileEntity.size + 100 * 1024 * 1024;

    // 校验文件
    try {
      const fileStat = await fse.stat(filePath);
      // 文件大小相同，则认为检验成功，无需重复合并
      if (fileStat.size === size) {
        fileEntity.status = FileStatusEnum.FINISHED;
        await fileEntity.save();
        return;
      }
      if (fileStat.size > size) {
        // 文件大于预期大小，删除文件
        await fse.rm(filePath);
      }
      // 上次合并失败导致文件残留，计算磁盘空间时需减去这部分大小
      needDiskSize -= fileStat.size;
    } catch (e) {
      // do nothing
    }

    // 检查磁盘空间
    const diskSpace = await checkDiskSpace(UPLOAD_FILE_DIR);
    if (diskSpace.free < needDiskSize) {
      throw new BadRequestException('磁盘空间不足，无法合并切片');
    }

    // 将记录状态改为正在合并切片
    fileEntity.status = FileStatusEnum.CHUNK_MERGING;
    await fileEntity.save();
    // 开始合并切片
    const limit = pLimit(9);
    await fse.access(chunkDir).catch(() => {
      throw new BadRequestException('不存在该文件的切片');
    });
    const chunkList = await fse.readdir(chunkDir);

    const fileHandle = await fsp.open(filePath, 'w');
    const promises = chunkList.map((chunkName) => {
      return limit(
        () =>
          new Promise(async (resolve, reject) => {
            // 直接读取文件到内存，会比stream流更快，但更占内存
            const chunk = await fse.readFile(path.join(chunkDir, chunkName), {
              flag: 'r',
            });
            const index = parseInt(chunkName);

            await fileHandle
              .write(
                chunk,
                0,
                chunk.byteLength,
                index * FileService.CHUNK_MAX_SIZE,
              )
              .catch((e) => reject(e));

            resolve(index);
          }),
      );
    });

    try {
      await Promise.all(promises);
    } catch (e) {
      fileEntity.status = FileStatusEnum.CHUNK_UPLOADED;
      await fileEntity.save();
      if (e.message === 'ENOSPC: no space left on device, write') {
        throw new BadRequestException('磁盘空间不足，无法合并切片');
      }
      throw e;
    } finally {
      await fileHandle.close();
    }

    try {
      const fileStat = await fse.stat(filePath);
      if (fileStat.size !== size) {
        throw new BadRequestException('合并后的文件大小不符合预期');
      }
    } catch (e) {
      throw new InternalServerErrorException('合并后的文件丢失');
    }
    // 移除切片
    await fse.remove(chunkDir);

    fileEntity.status = FileStatusEnum.FINISHED;
    await fileEntity.save();
  }

  /**
   * 下载文件
   */
  async download(id: number): Promise<StreamableFile> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new NotFoundException('文件记录不存在');
    }
    if (fileEntity.status !== FileStatusEnum.FINISHED) {
      throw new BadRequestException('文件尚未上传成功');
    }

    try {
      await fse.access(fileEntity.filePath);
    } catch (e) {
      throw new NotFoundException('文件不存在');
    }

    const file = fse.createReadStream(fileEntity.filePath);

    return new StreamableFile(file);
  }

  /**
   * 获取文件的chunk块的目录
   */
  public getChunkDir(fileHash: string): string {
    return path.join(UPLOAD_CHUNK_DIR, fileHash);
  }

  /**
   * 获取文件路径
   */
  private getFilePath(fileHash: string): string {
    return path.join(UPLOAD_FILE_DIR, fileHash);
  }
}
