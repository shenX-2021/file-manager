import { axios } from '@src/http/libs';
import { FileCheckStatusEnum, FileStatusEnum } from '@src/enums';

export interface ChangeFilenameFormData {
  filename: string;
}

export interface FileRecordListFormData {
  filename?: string;
  pageSize?: number;
  pageNumber?: number;
}
export interface FileRecordData {
  id: number;
  filename: string;
  fileHash: string;
  startHash: string;
  endHash: string;
  filePath: string;
  size: number;
  status: FileStatusEnum;
  checkStatus: FileCheckStatusEnum;
  gmtCreated: number;
  gmtModified: number;
}
export interface FileRecordListRo {
  pageNumber: number;
  pageSize: number;
  total: number;
  list: FileRecordData[];
}
export interface CheckFileRo {
  checkStatus: FileCheckStatusEnum;
}

// 修改文件名
export function changeFilenameApi(id: number, data: ChangeFilenameFormData) {
  return axios.patch(`/file/record/filename/${id}`, data);
}
// 获取文件记录列表
export function fileRecordListApi(
  params: FileRecordListFormData,
): Promise<FileRecordListRo> {
  return axios.get('/file/record/list', { params });
}
// 通过id获取文件记录
export function fileRecordDetailApi(id: number): Promise<FileRecordData> {
  return axios.get(`/file/record/${id}`);
}
// 校验文件
export function checkFileApi(id: number): Promise<CheckFileRo> {
  return axios.patch(`/file/record/check/${id}`);
}
// 校验文件
export function deleteFileApi(id: number): Promise<void> {
  return axios.delete(`/file/record/${id}`);
}
