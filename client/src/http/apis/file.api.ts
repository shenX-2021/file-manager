import { axios } from '@src/http/libs';

export interface VerifyFileFormData {
  fileHash: string;
  filename: string;
  size: number;
}
export interface VerifyRo {
  needUpload: boolean;
  uploadedList?: string[];
}

export interface MergeChunkFormData {
  fileHash: string;
  size: number;
}

// 验证文件信息
export function verifyFileApi(data: VerifyFileFormData): Promise<VerifyRo> {
  return axios.post('/fm/file/verify', data);
}
// 合并文件
export function mergeChunkApi(data: MergeChunkFormData) {
  return axios.post('/fm/file/merge', data);
}
