import { axios } from '@src/http/libs';

export interface VerifyFileFormData {
  filename: string;
  fileHash: string;
  startHash: string;
  endHash: string;
  size: number;
}
interface WithoutUploadData {
  id: number;
  needUpload: false;
}
interface NeedUploadData {
  id: number;
  needUpload: true;
  uploadedList: string[];
}
interface SuccessRo {
  code: 0;
  data: WithoutUploadData | NeedUploadData;
}
interface ChangeNameRo {
  code: 1;
  message: string;
  data: {
    id: number;
    originFileName: string;
  };
}
export type VerifyRo = SuccessRo | ChangeNameRo;

export interface MergeChunkFormData {
  fileHash: string;
  size: number;
}
export interface MergeChunkRo {
  percentage: number;
}

// 验证文件信息
export function verifyFileApi(data: VerifyFileFormData): Promise<VerifyRo> {
  return axios.post('/file/verify', data);
}
// 合并文件
export function mergeChunkApi(data: MergeChunkFormData): Promise<MergeChunkRo> {
  return axios.post('/file/merge', data);
}
// 取消合并文件
export function cancelMergeChunkApi(id: number): Promise<void> {
  return axios.patch(`/file/merge/cancel/${id}`, null, { timeout: 120_000 });
}
