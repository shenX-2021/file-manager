import {
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Ws } from '@src/typings/ws';
import { FileService } from '@src/modules/file/file/service/file.service';
import * as path from 'path';
import * as fsp from 'fs/promises';
import * as fse from 'fs-extra';
import * as qs from 'querystring';

function sendJson(data: Record<string, unknown>) {
  this.send(JSON.stringify(data));
}

interface Query {
  fileHash: string;
  size: string;
}

@WebSocketGateway({
  path: '/fm/api/ws',
})
export class UploadGateway implements OnGatewayConnection<Ws.Websocket> {
  constructor(private readonly fileService: FileService) {}

  async handleConnection(client: Ws.Websocket, options) {
    client.sendJson = sendJson.bind(client);
    client.headers = options.headers;

    const query = qs.parse(
      options.url.replace('/fm/api/ws?', ''),
    ) as unknown as Query;
    const fileHash = query.fileHash;
    const size = parseInt(query.size);
    client.fileData = {
      fileHash,
      size,
    };

    const dir = this.fileService.getChunkDir(client.fileData.fileHash);
    await fse.ensureDir(dir);

    client.isAuth = true;

    client.sendJson({
      code: 0,
    });
  }

  handleMessage(client: Ws.Websocket, payload: Buffer): Promise<unknown>;
  handleMessage(client: Ws.Websocket, payload: string): Promise<unknown>;

  @SubscribeMessage('message')
  async handleMessage(
    client: Ws.Websocket,
    payload: unknown,
  ): Promise<Ws.Response> {
    // TODO: 查验磁盘空间
    if (typeof payload === 'string') {
      return this.handleAction(client, payload);
    } else if (Buffer.isBuffer(payload)) {
      return this.handleUpload(client, payload);
    }

    return {
      code: 50007,
      error: '错误的数据类型',
    };
  }

  /**
   * 处理动作指令
   */
  private async handleAction(
    client: Ws.Websocket,
    payload: string,
  ): Promise<Ws.Response> {
    const obj = JSON.parse(payload);
    if (typeof obj !== 'object') {
      return {
        code: 40000,
        error: '参数错误',
      };
    }

    const { action, data } = obj;
    if (action === 'chunkConfig') {
      if (client.chunkData) {
        return {
          code: 50001,
          error: '当前正在上传中，无法更新配置',
        };
      }
      const { chunkData } = data;
      const dir = this.fileService.getChunkDir(client.fileData.fileHash);
      const chunkPath = path.join(dir, chunkData.index.toString());
      const fileHandle: fsp.FileHandle = await fsp.open(chunkPath, 'w');

      client.chunkData = {
        dir,
        size: chunkData.size,
        index: chunkData.index,
        path: chunkPath,
        fileHandle,
        uploading: false,
        offset: 0n,
      };
      return {
        code: 1,
      };
    }
    if (action === 'reset') {
      const { size, path } = client.chunkData;
      try {
        const chunkStat = await fse.stat(path);
        if (chunkStat.size !== size) {
          return {
            code: 50005,
            error: '切片大小与预期不符',
          };
        }
      } catch (e) {
        return {
          code: 50006,
          error: '上传的切片丢失',
        };
      }

      // 重置数据，通知客户端可以上传下一份切片
      delete client.chunkData;
      return {
        code: 0,
      };
    }
  }

  /**
   * 处理文件上传
   */
  private async handleUpload(
    client: Ws.Websocket,
    payload: Buffer,
  ): Promise<Ws.Response> {
    if (!client.chunkData) {
      return {
        code: 50002,
        error: '尚未设置切片配置，无法上传',
      };
    }
    if (client.chunkData.uploading) {
      return {
        code: 50003,
        error: '还在上传中，请稍后再上传',
      };
    }
    client.chunkData.uploading = true;
    const { fileHandle, offset: currentOffset, size } = client.chunkData;
    const offset = payload.slice(0, 8).readBigInt64LE();
    const buffer = payload.slice(8);
    if (offset !== currentOffset) {
      return {
        code: 50004,
        error: '文件的偏移量错误',
      };
    }
    await fileHandle.write(buffer);
    const chunkStat = await fileHandle.stat();
    if (chunkStat.size === size) {
      await fileHandle.close();
      return {
        code: 3,
      };
    } else {
      client.chunkData.offset = offset + BigInt(buffer.byteLength);
      client.chunkData.uploading = false;
      return {
        code: 2,
        data: {
          offset: Number(client.chunkData.offset),
          size: buffer.byteLength,
        },
      };
    }
  }
}
