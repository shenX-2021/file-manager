import { axios } from '@src/http/libs';

export interface VerifyFileFormData {
  filename: string;
  fileHash: string;
  startHash: string;
  endHash: string;
  size: number;
}
interface WithoutUploadData {
  needUpload: false;
}
interface NeedUploadData {
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

export interface ChangeFilenameFormData {
  filename: string;
}

// 验证文件信息
export function verifyFileApi(data: VerifyFileFormData): Promise<VerifyRo> {
  return axios.post('/fm/file/verify', data);
}
// 合并文件
export function mergeChunkApi(data: MergeChunkFormData) {
  return axios.post('/fm/file/merge', data);
}
// 修改文件名
export function changeFilenameApi(id: number, data: ChangeFilenameFormData) {
  return axios.patch(`/fm/file/record/filename/${id}`, data);
}
