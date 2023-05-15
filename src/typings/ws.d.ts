import * as WsWebsocket from 'ws';
import { Request } from '@nestjs/common';
import * as fsp from 'fs/promises';

interface ErrorResponse {
  code: 10003 | 40000 | 50001 | 50002 | 50003 | 50004 | 50005 | 50006 | 50007;
  error: string;
}
interface AuthSuccessResponse {
  code: 0;
}
interface AllowUploadResponse {
  code: 1;
}
interface ContinueUploadResponse {
  code: 2;
  data: {
    offset: number;
    size: number;
  };
}
interface UploadDoneResponse {
  code: 3;
}

export namespace Ws {
  export interface Websocket extends WsWebsocket {
    headers: Request.headers;
    sendJson: (data: Response) => void;
    isAuth: boolean;
    fileData: {
      fileHash: string;
      size: number;
    };
    chunkData: {
      dir: string;
      path: string;
      index: number;
      size: number;
      fileHandle: fsp.FileHandle;
      uploading: boolean;
      offset: bigint;
    } & Record<string, any>;
  }

  export type Response =
    | ErrorResponse
    | AuthSuccessResponse
    | AllowUploadResponse
    | ContinueUploadResponse
    | UploadDoneResponse;
}
