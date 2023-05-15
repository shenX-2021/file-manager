import { FileConfigEnum } from '@src/enums';
import EventEmitter from 'events';

export interface UploadedEventData {
  index: number;
  size: number;
}

export class UploadWebsocket extends EventEmitter {
  // 每次上传的数据大小峰值
  static BLOB_SIZE = 100 * 1024;
  // 二进制数据header的长度
  static HEADER_LENGTH = 8;
  // id计算
  static INCREASE_ID = 0;

  public readonly id: number;
  private index = -1;
  private chunkSize = 0;
  private offset = 0n;
  private readonly url: string;
  private readonly ws: WebSocket;
  private uploadedSize = 0;
  private blobList: Blob[] = [];

  private readyUpload = false;
  private uploading = false;
  private pausing = false;
  private stopping = false;
  private closing = false;
  private closed = false;
  private sending = false;

  get isWorking() {
    return this.uploading;
  }

  private get isAllowSend() {
    return (
      !this.closed &&
      !this.closing &&
      !this.pausing &&
      !this.stopping &&
      this.readyUpload
    );
  }

  constructor(fileHash: string, size: number) {
    super();
    this.url = `ws://localhost:8888/fm/api/ws?fileHash=${fileHash}&size=${size}`;
    this.ws = new WebSocket(this.url);
    this.ws.onopen = this.onopen.bind(this);
    this.ws.onmessage = this.onmessage.bind(this);
    this.ws.onerror = this.onerror.bind(this);
    this.ws.onclose = this.onclose.bind(this);
    this.id = UploadWebsocket.INCREASE_ID++;
  }

  private onopen() {}
  private async onmessage(ev: MessageEvent) {
    if (this.closing || this.closed) return;
    const res = JSON.parse(ev.data);
    const { code, data } = res;

    switch (code) {
      // 鉴权成功，触发open事件
      case 0: {
        this.readyUpload = true;
        this.offset = 0n;
        this.emit('open');
        break;
      }
      // 开始发送blob
      case 1: {
        await this.sendBlob();
        break;
      }
      // 上传blob成功，但需要继续上传
      case 2: {
        const { offset, size } = data;
        this.offset = offset;
        this.uploadedSize += size;
        this.emit('uploaded-size', {
          index: this.index,
          size: this.uploadedSize,
        });
        setTimeout(async () => {
          await this.sendBlob();
        }, 20);
        break;
      }
      // 全部上传成功
      case 3: {
        this.blobList = [];
        this.readyUpload = false;
        this.uploading = false;
        this.uploadedSize = 0;
        this.ws.send(
          JSON.stringify({
            action: 'reset',
          }),
        );
        this.emit('uploaded-size', { index: this.index, size: this.chunkSize });
        break;
      }
      case 50005: {
        // TODO: 切片大小与预期不符，需重新上传
        this.emit('uploaded-size', { index: this.index, size: 0 });
        this.close();
        break;
      }
      // 未处理的异常
      default: {
        // eslint-disable-next-line no-console
        this.emit('error', new Error(`${res.code}: ${res.error}`));
        this.close();
      }
    }
  }
  private onerror(ev: Event) {
    // eslint-disable-next-line no-console
    console.error('ws error:', ev);
    this.emit('error', new Error('连接Websocket失败'));
  }
  private onclose() {
    this.closing = false;
    this.close();
  }

  private async sendBlob() {
    if (this.sending || !this.isAllowSend) return;
    this.sending = true;
    const blob = this.blobList.shift();
    if (!blob) {
      // TODO: 重置处理
      return;
    }
    // header，用来存储数据的偏移量
    const header = new ArrayBuffer(UploadWebsocket.HEADER_LENGTH);
    const headerArr = new BigUint64Array(header);
    headerArr[0] = BigInt(this.offset);

    // body，存储文件切片数据
    const body = await blob.arrayBuffer();

    // 拼接header和body
    const buffer = new ArrayBuffer(
      UploadWebsocket.HEADER_LENGTH + body.byteLength,
    );
    const bufferArr = new Uint8Array(buffer);
    bufferArr.set(new Uint8Array(header));
    bufferArr.set(new Uint8Array(body), UploadWebsocket.HEADER_LENGTH);

    if (this.isAllowSend) {
      this.ws.send(buffer);
    } else {
      this.blobList.unshift(blob);
    }

    this.sending = false;
  }

  async upload(chunk: Blob, index: number) {
    if (!this.readyUpload) {
      throw new Error('尚未建立连接成功，请稍后再试');
    }
    if (this.uploading) {
      throw new Error('目前正在存在上传任务，请稍后再试');
    }
    // 分隔切片
    this.index = index;
    let cur = 0;
    while (cur < chunk.size) {
      const end = cur + UploadWebsocket.BLOB_SIZE;
      this.blobList.push(chunk.slice(cur, end));
      cur = end;
    }

    this.uploading = true;
    this.chunkSize = chunk.size;
    // 上传前，需要设置切片的配置
    this.ws.send(
      JSON.stringify({
        action: 'chunkConfig',
        data: {
          chunkData: {
            index,
            size: chunk.size,
          },
        },
      }),
    );
  }

  pause() {
    this.pausing = true;
  }

  async resume() {
    if (this.pausing) {
      this.pausing = false;
      await this.sendBlob();
    }
  }

  stop() {
    this.stopping = true;
    this.readyUpload = false;
    this.uploading = false;
    this.index = -1;
    this.chunkSize = 0;
    this.offset = 0n;
    this.uploadedSize = 0;
    this.blobList = [];
  }

  close() {
    if (![WebSocket.CLOSING, WebSocket.CLOSED].includes(this.ws.readyState)) {
      this.closing = true;
      this.ws.close();
    } else {
      this.stopping = false;
      this.closed = true;
      this.emit('close');
    }
  }

  on(eventName: 'open', listener: () => void): this;
  on(eventName: 'error', listener: (err: Error) => void): this;
  on(eventName: 'uploaded', listener: (...args) => void): this;
  on(eventName: 'close', listener: (...args) => void): this;
  on(
    eventName: 'uploaded-size',
    listener: (data: UploadedEventData) => void,
  ): this;
  on(eventName: string | symbol, listener: (...args) => void): this {
    super.on(eventName, listener);
    return this;
  }
  emit(eventName: 'open'): boolean;
  emit(eventName: 'error', err: Error): boolean;
  emit(eventName: 'uploaded', ...args): boolean;
  emit(eventName: 'close', ...args): boolean;
  emit(eventName: 'uploaded-size', data: UploadedEventData): boolean;
  emit(eventName: string | symbol, ...args): boolean {
    return super.emit(eventName, ...args);
  }
}

interface ChunkData {
  chunk: Blob;
  index: number;
}

export class UploadHandler extends EventEmitter {
  static UPLOADING = false;

  private readonly file: File;
  private readonly fileHash: string;
  private chunkQueue: ChunkData[] = [];
  private wsList: UploadWebsocket[] = [];
  private closing = false;
  private percentageMap: Record<number, number> = {};

  constructor(file: File, fileHash: string, uploadedList: string[] = []) {
    super();
    if (UploadHandler.UPLOADING) {
      throw new Error('其他文件上传中，请稍后再试');
    }
    UploadHandler.UPLOADING = true;
    this.file = file;
    this.fileHash = fileHash;

    // 将文件切片
    let index = 0;
    let cur = 0;
    while (cur < file.size) {
      const end = cur + FileConfigEnum.SIZE;
      if (!uploadedList.includes(index.toString())) {
        this.chunkQueue.push({ chunk: file.slice(cur, end), index });
      } else {
        this.percentageMap[index] =
          end > file.size ? file.size - cur : FileConfigEnum.SIZE;
      }

      cur = end;
      index++;
    }
  }

  get percentage() {
    const loaded =
      Object.values(this.percentageMap).reduce((prev, cur) => {
        return prev + cur;
      }, 0) || 0;
    return Math.floor((loaded / this.file.size) * 100);
  }

  // 开始上传
  upload() {
    const length = Math.min(5, this.chunkQueue.length);
    if (length === 0) {
      // 文件无需上传的处理
      this.close();
      return;
    }
    for (let i = 0; i < length; i++) {
      const ws = new UploadWebsocket(this.fileHash, this.file.size);
      ws.on('open', this.uploadChunk.bind(this, ws));
      ws.on('uploaded-size', (data) => {
        const { index, size } = data;
        this.percentageMap[index] = size;
        this.emit('percentage', this.percentage);
      });
      ws.on('uploaded', this.uploadChunk.bind(this, ws));
      ws.on('close', () => {
        const idx = this.wsList.findIndex((item) => item.id === ws.id);
        if (idx !== -1) {
          this.wsList.splice(idx, 1);
        }
        if (this.wsList.length === 0 && UploadHandler.UPLOADING) {
          this.handleClose();
        }
      });
      ws.on('error', (err) => {
        this.emit('error', err);
      });

      this.wsList.push(ws);
    }
  }

  pause() {
    for (const ws of this.wsList) {
      ws.pause();
    }
  }

  async resume() {
    for (const ws of this.wsList) {
      await ws.resume();
    }
  }

  async stop() {
    this.close();
  }

  close() {
    if (this.closing) return;
    this.closing = true;
    if (this.wsList.length === 0) {
      // 文件无需上传的处理
      this.handleClose();
    } else {
      for (const ws of this.wsList) {
        ws.close();
      }
    }
    this.closing = false;
  }

  // 开始上传切片
  private uploadChunk(ws: UploadWebsocket) {
    const chunkData = this.chunkQueue.shift();
    if (!chunkData) {
      const isDone = this.wsList.every((item) => !item.isWorking);
      if (isDone) {
        this.close();
      }
      return;
    }
    ws.upload(chunkData.chunk, chunkData.index);
  }

  // 处理关闭逻辑
  private handleClose() {
    UploadHandler.UPLOADING = false;
    this.emit('close', this.chunkQueue.length === 0);
    this.removeAllListeners();
  }

  on(eventName: 'error', listener: (err: Error) => void): this;
  on(eventName: 'close', listener: (isDone: boolean) => void): this;
  on(eventName: 'percentage', listener: (percentage: number) => void): this;
  on(eventName: string | symbol, listener: (...args) => void): this {
    super.on(eventName, listener);
    return this;
  }
  emit(eventName: 'error', err: Error): boolean;
  emit(eventName: 'close', isDone: boolean): boolean;
  emit(eventName: 'percentage', percentage: number): boolean;
  emit(eventName: string | symbol, ...args): boolean {
    return super.emit(eventName, ...args);
  }
}
