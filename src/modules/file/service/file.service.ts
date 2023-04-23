import { Injectable } from '@nestjs/common';
import { UploadChunkDto, VerifyDto } from '../dtos';
import * as fse from 'fs-extra';
import * as path from 'path';

@Injectable()
export class FileService {
  static UPLOAD_DIR = path.join(__dirname, '../../../../', 'target');
  static CHUNK_DIR = path.join(__dirname, '../../../../', 'chunk');
  static CHUNK_MAX_SIZE = 30 * 1024 * 1024;

  /**
   * 验证是否已经上传
   */
  async verify(verifyDto: VerifyDto) {
    const { filename, fileHash, size, chunkCount } = verifyDto;
    const filePath = this.getFilePath(fileHash, filename);
    console.log('filePath', filePath);

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
    const { fileHash, filename, chunkIndex, chunkCount } = uploadChunkDto;

    const filePath = this.getFilePath(fileHash, filename);
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
   * 获取文件的chunk块的目录
   */
  private getChunkDir(fileHash: string): string {
    return path.join(FileService.CHUNK_DIR, fileHash);
  }

  /**
   * 获取文件路径
   */
  private getFilePath(fileHash: string, filename: string): string {
    const extname = path.extname(filename);
    return path.join(FileService.UPLOAD_DIR, `${fileHash}${extname}`);
  }
}
