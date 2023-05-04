import { reactive, Ref, ref } from 'vue';
import {
  changeFilenameApi,
  FileRecordData,
  fileRecordDetailApi,
  fileRecordDetailByPropApi,
  mergeChunkApi,
  verifyFileApi,
} from '@src/http/apis';
import { FileConfigEnum, UploadStatusEnum } from '@src/enums';
import pLimit from 'p-limit';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useList } from '@src/pages/home/composables/use-list.composable';

const { getList } = useList();

export interface ListItem extends FileRecordData {
  uploadedCount: number;
  chunkCount: number;
  uploadStatus: UploadStatusEnum;
  requestList: XMLHttpRequest[];
}

interface RequestOpts {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  requestList?: XMLHttpRequest[];
}

interface FileChunkItem {
  chunk: Blob;
  index: number;
}

const uploadState = reactive<{
  list: ListItem[];
  container: {
    file?: File;
    hash?: string;
    worker?: Worker;
    startHash?: string;
    endHash?: string;
  };
  status: UploadStatusEnum;
  fileChunkList: FileChunkItem[];
  hashPercentage: number;
  uploadDisabled: boolean;
}>({
  list: [],
  container: {
    file: undefined,
    hash: '',
    worker: undefined,
  },
  status: UploadStatusEnum.WAIT,
  fileChunkList: [],
  hashPercentage: 0,
  uploadDisabled: false,
});

function initUploadState() {
  uploadState.container = {
    file: undefined,
    hash: '',
    worker: undefined,
  };
  uploadState.hashPercentage = 0;
  uploadState.status = UploadStatusEnum.WAIT;
}
// 上传文件请求处理
async function handleUpload() {
  if (!uploadState.container.file) return;
  uploadState.uploadDisabled = true;
  uploadState.status = UploadStatusEnum.UPLOADING;
  const fileChunkList = createFileChunk(uploadState.container.file);
  uploadState.container.hash = await calculateHash(fileChunkList);
  uploadState.fileChunkList = fileChunkList;

  const { uploadedList, fileRecordId } = await verifyFile();

  if (uploadedList && fileRecordId) {
    const uploadFileRecordData = await getUploadFileRecordData(
      fileRecordId,
      uploadedList.length,
    );
    if (uploadFileRecordData) {
      const listItem = uploadState.list.find(
        (item) => item.id === uploadFileRecordData.value.id,
      );
      if (!listItem) {
        uploadState.list.unshift(uploadFileRecordData.value);
      }

      await uploadChunks(uploadedList, listItem || uploadState.list[0]);
    }
  }

  uploadState.uploadDisabled = false;
}

// 暂停上传
async function handlePause(uploadFileRecordData: ListItem) {
  uploadState.status = UploadStatusEnum.PAUSE;
  uploadFileRecordData.uploadStatus = UploadStatusEnum.PAUSE;

  uploadFileRecordData.requestList.forEach((xhr) => xhr?.abort());
  uploadFileRecordData.requestList = [];
  if (uploadState.container.worker) {
    uploadState.container.worker.onmessage = null;
  }
}
// 恢复上传
async function handleResume() {
  uploadState.status = UploadStatusEnum.UPLOADING;
  const { uploadedList, fileRecordId } = await verifyFile();

  if (uploadedList && fileRecordId) {
    const listItem = uploadState.list.find((item) => item.id === fileRecordId);
    if (!listItem) {
      return;
    }
    await uploadChunks(uploadedList, listItem);
  }
}
// 上传文件切片
async function uploadChunks(
  uploadedList: string[],
  uploadFileRecordData: ListItem,
) {
  if (!uploadState.container.file || !uploadState.container.hash) return;
  uploadFileRecordData.uploadStatus = UploadStatusEnum.UPLOADING;
  const file = uploadState.container.file;
  const fileHash = uploadState.container.hash;
  const limit = pLimit(6);
  const uploadList = uploadState.fileChunkList
    .filter((item) => !uploadedList.includes(item.index.toString()))
    .map((item) => {
      const formData = new FormData();
      formData.append('chunk', item.chunk);
      formData.append('chunkIndex', item.index.toString());
      formData.append('filename', file.name);
      formData.append('fileHash', fileHash);
      formData.append('size', file.size.toString());
      return { formData, index: item.index };
    })
    .map(({ formData }) =>
      limit(() =>
        uploadRequest({
          url: '/fm/api/file/upload',
          data: formData,
          requestList: uploadFileRecordData.requestList,
        }),
      ),
    );
  await Promise.all(uploadList);

  const { uploadedList: checkUploadedList } = await verifyFile();
  if (checkUploadedList?.length === uploadFileRecordData.chunkCount) {
    // 上传文件列表移除已上传成功的切片
    uploadState.list = uploadState.list.filter(
      (item) => item.fileHash !== uploadState.container.hash,
    );
    // 合并切片请求
    await mergeChunkApi({
      fileHash: uploadState.container.hash,
      size: uploadState.container.file.size,
    });

    ElMessage({ message: '上传文件成功', type: 'success' });
    // initState();
    await getList();
  } else {
    ElMessage({ message: '未知原因，上传切片不成功', type: 'error' });
  }
}

// 验证文件信息
async function verifyFile(): Promise<{
  uploadedList?: string[];
  fileRecordId?: number;
}> {
  if (!uploadState.container.file || !uploadState.container.hash) return {};
  if (!uploadState.container.startHash || !uploadState.container.endHash)
    return {};
  const filename = uploadState.container.file.name;

  let res = await verifyFileApi({
    filename: filename,
    fileHash: uploadState.container.hash,
    startHash: uploadState.container.startHash,
    endHash: uploadState.container.endHash,
    size: uploadState.container.file.size,
  });
  if (res.code === 1) {
    const { originFileName, id } = res.data;
    await ElMessageBox.confirm(
      `文件名【${filename}】与服务器存档的文件名【${originFileName}】不符，是否需要修改名字`,
      {
        confirmButtonText: '修改',
        cancelButtonText: '取消',
      },
    ).then(async () => {
      await changeFilenameApi(id, { filename });
    });

    res = await verifyFileApi({
      filename,
      fileHash: uploadState.container.hash,
      startHash: uploadState.container.startHash,
      endHash: uploadState.container.endHash,
      size: uploadState.container.file.size,
    });

    if (res.code === 1) {
      ElMessage({
        message: '修改文件名失败，页面即将刷新',
        type: 'error',
        duration: 3500,
        onClose: () => {
          location.reload();
        },
      });
    }
  }
  if (res.code === 0) {
    const { needUpload } = res.data;

    if (!needUpload) {
      ElMessage({
        message: '该文件已上传，无需重复上传',
        type: 'success',
      });
      uploadState.status = UploadStatusEnum.WAIT;
      // initState();
      return {};
    }
    const { uploadedList, id } = res.data;

    return {
      uploadedList,
      fileRecordId: id,
    };
  }

  return {};
}
// 创建文件切片
function createFileChunk(
  file: File,
  size = FileConfigEnum.SIZE,
): FileChunkItem[] {
  const fileChunkList: FileChunkItem[] = [];
  let cur = 0;
  let index = 0;
  while (cur < file.size) {
    fileChunkList.push({
      chunk: file.slice(cur, cur + size),
      index: index++,
    });
    cur += size;
  }
  return fileChunkList;
}

// 文件大小低于此数值的直接计算hash值
const CALCULATE_HASH_SIZE = 1 * 1024 * 1024;
// 生成文件hash
function calculateHash(fileChunkList: FileChunkItem[]): Promise<string> {
  return new Promise(async (resolve) => {
    const file = uploadState.container.file;
    if (!file) return;
    // 计算startHash和endHash
    const length =
      FileConfigEnum.SIZE >= file.size ? file.size : FileConfigEnum.SIZE;
    const startHash = await calculateBlobHash(file.slice(0, length));
    const endHash = await calculateBlobHash(file.slice(-length));
    uploadState.container.startHash = startHash;
    uploadState.container.endHash = endHash;

    if (file.size > CALCULATE_HASH_SIZE) {
      // 大于指定值，先查找服务器有没有匹配的文件
      const fileRecordData = await fileRecordDetailByPropApi({
        size: file.size,
        startHash,
        endHash,
      });
      // 存在文件记录，则直接返回hash值
      if (fileRecordData) {
        uploadState.hashPercentage = 100;
        resolve(fileRecordData.fileHash);
        return;
      }
    }

    // 计算整个文件的hash值
    uploadState.container.worker = new Worker('./hash.js');
    uploadState.container.worker.postMessage({
      fileChunkList: fileChunkList.map((item) => item.chunk),
    });
    uploadState.container.worker.onmessage = (e) => {
      const { percentage, hash } = e.data;

      uploadState.hashPercentage = percentage;
      if (hash) {
        resolve(hash);
      } else {
        // TODO: 计算hash失败的处理
      }
    };
  });
}

// 计算Blob切片的hash值
function calculateBlobHash(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const spark = new SparkMD5.ArrayBuffer();

    const reader = new FileReader();
    reader.readAsArrayBuffer(blob);

    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (e.target?.result) {
        spark.append(e.target.result);
        resolve(spark.end());
      } else {
        throw new Error('切片数据不存在');
      }
    };
  });
}

// 请求处理
function uploadRequest({ url, data, requestList }: RequestOpts): any {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('post', url);
    xhr.ontimeout = () => {
      onError && onError('上传切片请求超时');
    };
    xhr.send(data);
    xhr.onload = () => {
      // 将请求成功的 xhr 从列表中删除
      if (requestList) {
        const xhrIndex = requestList.findIndex((item) => item === xhr);
        requestList.splice(xhrIndex, 1);
      }

      if (xhr.status === 201) {
        const fileRecord = uploadState.list.find(
          (item) => item.fileHash === data.get('fileHash'),
        );
        if (fileRecord) {
          fileRecord.uploadedCount++;
        }
        resolve(1);
      } else if (xhr.status === 413) {
        onError && onError('大小超过了限制，请检查服务器的限制');
      } else {
        onError && onError('未知错误，上传失败');
      }
    };
    // 暴露当前 xhr 给外部
    requestList?.push(xhr);
  });
}

// 获取文件详情信息
async function getUploadFileRecordData(
  fileRecordId: number,
  uploadedCount: number,
): Promise<Ref<ListItem> | undefined> {
  if (!uploadState.container.file) return;
  const fileRecordData = await fileRecordDetailApi(fileRecordId);
  if (!fileRecordData) {
    ElMessage({
      message: '文件记录不存在',
      type: 'error',
    });
    uploadState.status = UploadStatusEnum.WAIT;
    // initState();
    return;
  }
  return ref<ListItem>({
    ...fileRecordData,
    chunkCount: Math.ceil(
      uploadState.container.file?.size / FileConfigEnum.SIZE,
    ),
    uploadedCount,
    uploadStatus: UploadStatusEnum.UPLOADING,
    requestList: [],
  });
}

// 用闭包保存每个 chunk 的失败后的处理
function onError(message: string) {
  ElMessage({
    type: 'error',
    message,
  });
  throw new Error('大小超过了限制，请检查服务器的限制');
}

export function useUpload() {
  return {
    uploadState,
    initUploadState,
    handleUpload,
    handlePause,
    handleResume,
  };
}
