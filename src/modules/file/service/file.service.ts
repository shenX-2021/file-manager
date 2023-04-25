import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { MergeChunkDto, UploadChunkDto, VerifyDto } from '../dtos';
import * as fse from 'fs-extra';
import * as path from 'path';
import { VerifyRo } from '../ros';
import * as pLimit from 'p-limit';

@Injectable()
export class FileService {
  static UPLOAD_DIR = path.join(__dirname, '../../../../target', 'files');
  static CHUNK_DIR = path.join(__dirname, '../../../../target', 'chunks');
  static CHUNK_MAX_SIZE = 30 * 1024 * 1024;

  /**
   * 验证是否已经上传
   */
  async verify(verifyDto: VerifyDto): Promise<VerifyRo> {
    const { filename, fileHash, size } = verifyDto;
    const filePath = this.getFilePath(fileHash);

    await fse.ensureDir(FileService.UPLOAD_DIR);

    try {
      const fileStat = await fse.stat(filePath);

      if (fileStat.size === size) {
        // 大小相同，则认为是文件一致，无需重复上传
        return {
          needUpload: false,
        };
      } else {
        // 大小不同，移除已上传的文件
        await fse.rm(filePath);
      }
    } catch (e) {
      // do nothing
    }
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
      uploadedList = await fse.readdir(chunkDir);
    }

    return {
      needUpload: true,
      uploadedList,
    };
  }

  /**
   * 上传文件切片
   */
  async uploadChunk(uploadChunkDto: UploadChunkDto, file: Express.Multer.File) {
    const { fileHash, filename, chunkIndex, size } = uploadChunkDto;

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

    await fse.ensureDir(chunkDir);

    await fse.writeFile(chunkPath, file.buffer);
    return {
      status: 1,
    };
  }

  /**
   * 合并文件切片
   */
  async mergeChunk(mergeChunkDto: MergeChunkDto) {
    const { fileHash, size } = mergeChunkDto;

    const chunkDir = this.getChunkDir(fileHash);
    const filePath = this.getFilePath(fileHash);

    try {
      const fileStat = await fse.stat(filePath);
      if (fileStat.size === size) {
        // TODO: 文件已合并
      } else if (fileStat.size > size) {
        // 文件大于预期大小，删除文件
        await fse.rm(filePath);
      }
    } catch (e) {
      // do nothing
    }
    const limit = pLimit(12);
    await fse.access(chunkDir).catch(() => {
      throw new BadRequestException('不存在该文件的切片');
    });
    const chunkList = await fse.readdir(chunkDir);
    const promises = chunkList.map((chunkName) => {
      return limit(() => {
        return new Promise(async (resolve) => {
          const chunk = await fse.readFile(path.join(chunkDir, chunkName));
          const index = parseInt(chunkName);
          const writeStream = fse.createWriteStream(filePath, {
            start: index * FileService.CHUNK_MAX_SIZE,
            flags: 'a',
          });
          writeStream.on('close', () => {
            resolve(index);
          });
          writeStream.end(chunk);
        });
      });
    });

    await Promise.all(promises);

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
  }

  /**
   * 获取文件的chunk块的目录
   */
  private getChunkDir(fileHash: string): string {
    return path.join(FileService.CHUNK_DIR, fileHash);
  }

  /**
   * 获取文件路径
   */
  private getFilePath(fileHash: string): string {
    return path.join(FileService.UPLOAD_DIR, fileHash);
  }
}
