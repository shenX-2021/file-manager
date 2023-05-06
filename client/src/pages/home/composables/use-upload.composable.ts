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
import HashWorker from '@src/workers/hash.js?worker';

const { getList } = useList();

export interface ListItem extends FileRecordData {
  chunkCount: number;
  uploadStatus: UploadStatusEnum;
  requestList: XMLHttpRequest[];
  fileChunkList: FileChunkItem[];
}

interface RequestOpts {
  url: string;
  data: any;
  requestList: XMLHttpRequest[];
  onProgress: (e) => void;
  onAbort: (e) => void;
}

interface FileChunkItem {
  chunk: Blob;
  index: number;
}

const uploadState = reactive<{
  list: ListItem[];
  status: UploadStatusEnum;
  fileChunkList: FileChunkItem[];
  hashPercentage: number;
  uploadDisabled: boolean;
  uploadPercentageMap: Record<number, Record<number, number>>;
}>({
  list: [],
  status: UploadStatusEnum.WAIT,
  fileChunkList: [],
  hashPercentage: 0,
  uploadDisabled: false,
  uploadPercentageMap: {},
});

function initUploadState() {
  uploadState.hashPercentage = 0;
  uploadState.status = UploadStatusEnum.WAIT;
}
// 上传文件请求处理
async function handleUpload(file: File) {
  uploadState.uploadDisabled = true;
  uploadState.status = UploadStatusEnum.UPLOADING;
  const fileChunkList = createFileChunk(file);
  const { startHash, endHash, fileHash } = await calculateHash(
    file,
    fileChunkList,
  );
  uploadState.fileChunkList = fileChunkList;

  const { uploadedList, fileRecordId } = await verifyFile(
    file.name,
    fileHash,
    startHash,
    endHash,
    file.size,
  );

  if (uploadedList && fileRecordId) {
    const uploadFileRecordData = await getUploadFileRecordData(
      fileRecordId,
      fileChunkList,
    );
    if (uploadFileRecordData) {
      uploadFileRecordData.value.fileChunkList = fileChunkList;
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
}
// 恢复上传
async function handleResume(uploadFileRecordData: ListItem) {
  uploadState.status = UploadStatusEnum.UPLOADING;
  const { uploadedList, fileRecordId } = await verifyFile(
    uploadFileRecordData.filename,
    uploadFileRecordData.fileHash,
    uploadFileRecordData.startHash,
    uploadFileRecordData.endHash,
    uploadFileRecordData.size,
  );

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
  uploadFileRecordData.uploadStatus = UploadStatusEnum.UPLOADING;
  const limit = pLimit(6);
  uploadState.uploadPercentageMap[uploadFileRecordData.id] = {};
  const percentageMap =
    uploadState.uploadPercentageMap[uploadFileRecordData.id];
  const uploadList = uploadFileRecordData.fileChunkList
    .filter((item) => {
      const isUploaded = uploadedList.includes(item.index.toString());
      if (isUploaded) {
        percentageMap[item.index] = FileConfigEnum.SIZE;
      }
      return !isUploaded;
    })
    .map((item) => {
      const formData = new FormData();
      formData.append('chunk', item.chunk);
      formData.append('chunkIndex', item.index.toString());
      formData.append('filename', uploadFileRecordData.filename);
      formData.append('fileHash', uploadFileRecordData.fileHash);
      formData.append('size', uploadFileRecordData.size.toString());
      return { formData, index: item.index, size: item.chunk.size };
    })
    .map(({ formData, index, size }) =>
      limit(() =>
        uploadRequest({
          url: '/fm/api/file/upload',
          data: formData,
          requestList: uploadFileRecordData.requestList,
          onProgress: createProgressHandler(percentageMap, index),
          onAbort: createAbortHandler(percentageMap, index),
        }).then(() => {
          percentageMap[index] = size;
        }),
      ),
    );
  await Promise.all(uploadList);

  const { uploadedList: checkUploadedList } = await verifyFile(
    uploadFileRecordData.filename,
    uploadFileRecordData.fileHash,
    uploadFileRecordData.startHash,
    uploadFileRecordData.endHash,
    uploadFileRecordData.size,
  );
  if (checkUploadedList?.length === uploadFileRecordData.chunkCount) {
    delete uploadState.uploadPercentageMap[uploadFileRecordData.id];
    // 上传文件列表移除已上传成功的切片
    uploadState.list = uploadState.list.filter(
      (item) => item.fileHash !== uploadFileRecordData.fileHash,
    );
    // 合并切片请求
    await mergeChunkApi({
      fileHash: uploadFileRecordData.fileHash,
      size: uploadFileRecordData.size,
    });

    ElMessage({ message: '上传文件成功', type: 'success' });
    // initState();
    await getList();
  } else {
    ElMessage({ message: '未知原因，上传切片不成功', type: 'error' });
  }
}

// 验证文件信息
async function verifyFile(
  filename: string,
  fileHash: string,
  startHash: string,
  endHash: string,
  size: number,
): Promise<{
  uploadedList?: string[];
  fileRecordId?: number;
}> {
  let res = await verifyFileApi({
    filename: filename,
    fileHash,
    startHash,
    endHash,
    size,
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
      fileHash,
      startHash,
      endHash,
      size,
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
const CALCULATE_HASH_SIZE = 1024 * 1024;
// 生成文件hash
function calculateHash(
  file: File,
  fileChunkList: FileChunkItem[],
): Promise<{
  fileHash: string;
  startHash: string;
  endHash: string;
}> {
  return new Promise(async (resolve) => {
    if (!file) return;
    // 计算startHash和endHash
    const length =
      FileConfigEnum.SIZE >= file.size ? file.size : FileConfigEnum.SIZE;

    const [startHash, endHash] = await Promise.all([
      getChunkHash(file.slice(0, length)),
      getChunkHash(file.slice(-length)),
    ]);

    if (file.size > CALCULATE_HASH_SIZE) {
      // 大于指定值，先查找服务器有没有匹配的文件
      const fileRecordData = await fileRecordDetailByPropApi({
        size: file.size,
        startHash,
        endHash,
      });
      // 存在文件记录，则直接返回hash值
      if (fileRecordData) {
        fileRecordData.loading = false;
        uploadState.hashPercentage = 100;
        resolve({
          fileHash: fileRecordData.fileHash,
          startHash,
          endHash,
        });
        return;
      }
    }

    // 计算整个文件的hash值
    const worker = new HashWorker();
    worker.postMessage({
      fileChunkList: fileChunkList.map((item) => item.chunk),
    });
    worker.onmessage = (e) => {
      const { percentage, hash } = e.data;

      uploadState.hashPercentage = percentage;
      if (hash) {
        resolve({
          fileHash: hash,
          startHash,
          endHash,
        });
        worker.terminate();
      }
    };
  });
}
// 获取切片的的hash值
function getChunkHash(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // 计算整个文件的hash值
    const worker = new HashWorker();
    const timer = setTimeout(() => {
      worker.terminate();
      ElMessage({
        message: '计算文件切片的hash值失败',
        type: 'error',
      });
      reject(new Error('计算文件切片的hash值超时'));
    }, 5000);
    worker.postMessage({
      fileChunkList: [chunk],
    });
    worker.onmessage = (e) => {
      const { hash } = e.data;

      if (hash) {
        resolve(hash);
        clearTimeout(timer);
        worker.terminate();
      }
    };
  });
}

// 请求处理
function uploadRequest({
  url,
  data,
  requestList,
  onProgress,
  onAbort,
}: RequestOpts): any {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.ontimeout = () => {
      onError && onError('上传切片请求超时');
    };
    xhr.upload.onprogress = onProgress;
    xhr.onabort = onAbort;
    xhr.onload = () => {
      // 将请求成功的 xhr 从列表中删除
      if (requestList) {
        const xhrIndex = requestList.findIndex((item) => item === xhr);
        requestList.splice(xhrIndex, 1);
      }

      if (xhr.status === 201) {
        resolve(1);
      } else if (xhr.status === 413) {
        onError && onError('大小超过了限制，请检查服务器的限制');
      } else {
        onError && onError('未知错误，上传失败');
      }
    };
    xhr.open('post', url);
    xhr.send(data);
    // 暴露当前 xhr 给外部
    requestList?.push(xhr);
  });
}

// 获取文件详情信息
async function getUploadFileRecordData(
  fileRecordId: number,
  fileChunkList: FileChunkItem[],
): Promise<Ref<ListItem> | undefined> {
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
    loading: false,
    chunkCount: Math.ceil(fileRecordData.size / FileConfigEnum.SIZE),
    uploadStatus: UploadStatusEnum.UPLOADING,
    requestList: [],
    fileChunkList,
  });
}

// 上传切片失败后的处理
function onError(message: string) {
  ElMessage({
    type: 'error',
    message,
  });
  throw new Error('大小超过了限制，请检查服务器的限制');
}

function createProgressHandler(map: Record<number, number>, index: number) {
  return (e) => {
    map[index] = e.loaded;
  };
}
function createAbortHandler(map: Record<number, number>, index: number) {
  return () => {
    map[index] = 0;
  };
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
