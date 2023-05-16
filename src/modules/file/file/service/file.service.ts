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
import { MergeChunkRo, VerifyRo } from '../ros';
import * as pLimit from 'p-limit';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity } from '../../../../entities';
import { Repository } from 'typeorm';
import { FileCheckStatusEnum, FileStatusEnum } from '../../../../enums';
import { UPLOAD_CHUNK_DIR, UPLOAD_FILE_DIR } from '../../../../config';
import { Request } from 'express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { ConfigService } from '../../../shared/services/config/config.service';

interface MergeData {
  fileHandle: fsp.FileHandle;
  promiseHandle: Promise<number[]>;
  finishedSet: Set<string>;
  chunkCount: number;
  closing: boolean;
  limit: pLimit.Limit;
}

@Injectable()
export class FileService {
  // 切片最大值
  static CHUNK_MAX_SIZE = 30 * 1024 * 1024;
  // 文件合并数据映射
  static MERGE_DATA_MAP: Record<number, MergeData> = {};

  constructor(
    @InjectRepository(FileEntity)
    private readonly fileEntityRepository: Repository<FileEntity>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 验证是否已经上传
   */
  async verify(verifyDto: VerifyDto): Promise<VerifyRo> {
    // TODO: 查验磁盘空间
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
          id: fileEntity.id,
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
            id: fileEntity.id,
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
    const chunkCount = this.getChunkCount(size);

    // 检查目录下所有切片
    const chunkDir = this.getChunkDir(fileHash);
    let uploadedList: string[] = [];
    if (await fse.exists(chunkDir)) {
      const chunkNames = await fse.readdir(chunkDir);
      for (const chunkName of chunkNames) {
        // 检查大小是否正常
        try {
          const chunkPath = path.join(chunkDir, chunkName);
          const chunkStat = await fse.stat(chunkPath);
          let expectSize: number;
          if (chunkName !== (chunkCount - 1).toString()) {
            // 切片不为最后一块，期望大小为切片最大值
            expectSize = FileService.CHUNK_MAX_SIZE;
          } else {
            // 计算最后一块切片应有的大小
            expectSize =
              size % FileService.CHUNK_MAX_SIZE
                ? size % FileService.CHUNK_MAX_SIZE
                : FileService.CHUNK_MAX_SIZE;
          }
          // 大小和期望的大小不一致，移除切片
          if (chunkStat.size !== expectSize) {
            await fse.rm(chunkPath);
          }
        } catch (e) {
          // do nothing
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
        id: fileEntity.id,
        needUpload: true,
        uploadedList,
      },
    };
  }

  /**
   * 上传文件切片
   */
  async uploadChunk(uploadChunkDto: UploadChunkDto, req: Request) {
    const { fileHash, chunkIndex, size } = uploadChunkDto;

    const filePath = this.getFilePath(fileHash);
    const chunkDir = this.getChunkDir(fileHash);

    await fse.ensureDir(chunkDir);
    const chunkPath = path.join(chunkDir, chunkIndex.toString());

    const { buffer } = await this.parseBuffer(req);

    // 文件已上传
    if (await fse.exists(filePath)) {
      return {
        status: 0,
      };
    }
    // 检查切片状态
    try {
      const chunkStat = await fse.stat(chunkPath);

      const chunkCount = this.getChunkCount(size);
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

    await fse.writeFile(chunkPath, buffer, { flag: 'wx' });
    return {
      status: 1,
    };
  }

  /**
   * 合并文件切片
   */
  async mergeChunk(mergeChunkDto: MergeChunkDto): Promise<MergeChunkRo> {
    const { fileHash, size } = mergeChunkDto;

    const fileEntity = await this.fileEntityRepository.findOneBy({ fileHash });
    if (!fileEntity) {
      throw new BadRequestException('文件记录不存在，无法合并切片');
    }

    if (!fileEntity.filePath) {
      fileEntity.filePath = this.getFilePath(fileHash);
    }

    const filePath = fileEntity.filePath;
    const chunkDir = this.getChunkDir(fileHash);

    if (fileEntity.status !== FileStatusEnum.CHUNK_UPLOADED) {
      // 切片正在合并
      if (fileEntity.status === FileStatusEnum.CHUNK_MERGING) {
        const mergeData = FileService.MERGE_DATA_MAP[fileEntity.id];
        if (!mergeData) {
          throw new BadRequestException(
            '合并切片的数据缓存丢失，请重新上传切片',
          );
        }
        const percentage = Math.floor(
          (mergeData.finishedSet.size / mergeData.chunkCount) * 100,
        );

        return {
          percentage,
        };
      }
      // 文件已上传完毕
      if (fileEntity.status === FileStatusEnum.FINISHED) {
        return {
          percentage: 100,
        };
      }

      throw new BadRequestException('文件记录的状态不正确');
    }

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
      fileEntity.status = FileStatusEnum.CHUNK_UPLOADED;
      await fileEntity.save();
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

    const fileHandle: fsp.FileHandle = await fsp.open(filePath, 'w');
    const promises = chunkList.map((chunkName) => {
      return limit(
        () =>
          new Promise<number>(async (resolve, reject) => {
            const mergeData = FileService.MERGE_DATA_MAP[fileEntity.id];
            if (!mergeData || mergeData.closing) {
              console.log(`文件【id: ${fileEntity.id}】的合并处理已取消`);
              return resolve(-1);
            }
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

            mergeData.finishedSet.add(chunkName);
            resolve(index);
          }),
      );
    });

    const promiseHandle = Promise.all(promises)
      .then(async () => {
        const fileStat = await fse.stat(filePath).catch(() => {
          throw new InternalServerErrorException('合并后的文件丢失');
        });
        if (fileStat.size !== size) {
          throw new BadRequestException('合并后的文件大小不符合预期');
        }
        // 移除切片
        await fse.remove(chunkDir);

        // 关闭文件
        await fileHandle.close();
        // 删除合并文件数据缓存
        delete FileService.MERGE_DATA_MAP[fileEntity.id];

        // 将文件状态改为已完成
        fileEntity.status = FileStatusEnum.FINISHED;
        await fileEntity.save();

        return [];
      })
      .catch(async (e) => {
        fileEntity.status = FileStatusEnum.CHUNK_UPLOADED;
        await fileEntity.save();

        if (e.message === 'ENOSPC: no space left on device, write') {
          console.trace('磁盘空间不足，无法合并切片');
        } else if (e.message === 'file closed') {
          console.trace('已取消合并切片的请求');
        } else {
          console.error('未处理的异常:', e);
          // TODO: 这里可以做邮件提醒
        }

        try {
          await fileHandle.close();
        } catch (e) {}

        return [];
      });

    FileService.MERGE_DATA_MAP[fileEntity.id] = {
      fileHandle,
      promiseHandle,
      finishedSet: new Set<string>(),
      chunkCount: this.getChunkCount(fileEntity.size),
      closing: false,
      limit,
    };

    return {
      percentage: 0,
    };
  }

  /**
   * 取消合并切片
   */
  async cancelMerge(id: number): Promise<void> {
    const fileEntity = await this.fileEntityRepository.findOneBy({ id });
    if (!fileEntity) {
      throw new BadRequestException('文件记录不存在，无法合并切片');
    }

    const mergeData = FileService.MERGE_DATA_MAP[id];
    if (!mergeData) {
      throw new BadRequestException(`文件【id: ${id}】当前没有合并切片`);
    }

    mergeData.closing = true;
    mergeData.limit.clearQueue();
    await mergeData.fileHandle.close();
    delete FileService.MERGE_DATA_MAP[id];

    if (fileEntity.status === FileStatusEnum.CHUNK_MERGING) {
      fileEntity.status = FileStatusEnum.CHUNK_UPLOADED;
      await fileEntity.save();
    }
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

  /**
   * 获取切片总数
   */
  private getChunkCount(size: number) {
    return Math.ceil(size / FileService.CHUNK_MAX_SIZE);
  }

  /**
   * 获取文件buffer
   */
  public async parseBuffer(
    req: Request,
    options?: MulterOptions['storage'] & { limits?: any },
  ): Promise<{
    buffer: Buffer;
  }> {
    const storage = memoryStorage();

    const multerOptions: MulterOptions = { storage };
    if (options) Object.assign(multerOptions, { storage: options });

    // 如果上传带宽限制大于0，则需要限制上传的速度
    if (!this.configService.uploadBandwidth) {
      const bps = this.configService.uploadBandwidth * 1024;
      const onceReadSize = bps / 20;
      const duration = 50;

      return new Promise((resolve, reject) => {
        const buffers: Buffer[] = [];
        req.on('readable', async function () {
          req.socket.pause();
          let data: Buffer;
          while ((data = this.read(onceReadSize))) {
            buffers.push(data);
            await new Promise((resolve) => {
              setTimeout(() => {
                resolve(1);
              }, duration);
            });
          }
          req.socket.resume();
        });
        req.on('end', () => {
          const data = Buffer.concat(buffers);
          const payload = { buffer: data };

          resolve(payload);
        });
        req.on('error', reject);
        req.on('close', () => {
          console.log('close');
        });
        req.socket.on('drain', () => {
          console.log('drain');
        });
      });
    }

    // 未限制上传带宽，直接拼接buffer
    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        buffers.push(chunk);
      });
      req.on('end', () => {
        const data = Buffer.concat(buffers);
        const payload = { buffer: data };
        resolve(payload);
      });
      req.on('error', reject);
      req.on('close', () => {
        console.log('close');
      });
      req.socket.on('drain', () => {
        console.log('drain');
      });
    });
  }
}
