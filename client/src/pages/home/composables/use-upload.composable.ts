import { reactive, ref, shallowRef, UnwrapRef } from 'vue';
import {
  changeFilenameApi,
  FileRecordData,
  fileRecordDetailApi,
  fileRecordDetailByPropApi,
  mergeChunkApi,
  verifyFileApi,
} from '@src/http/apis';
import { FileConfigEnum, FileStatusEnum, UploadStatusEnum } from '@src/enums';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useList } from '@src/pages/home/composables/use-list.composable';
import HashWorker from '@src/workers/hash.js?worker';
import { UploadHandler } from '@src/utils';

const { getList, listState } = useList();

export interface ListItem extends FileRecordData {
  file: File;
  chunkCount: number;
  uploadStatus: UploadStatusEnum;
  percentage: number;
  uploadedList: string[];
}

interface FileChunkItem {
  chunk: Blob;
  index: number;
}

const uploadState = reactive<{
  list: ListItem[];
  status: UploadStatusEnum;
  hashPercentage: number;
  uploadDisabled: boolean;
}>({
  list: [],
  status: UploadStatusEnum.WAIT,
  hashPercentage: 0,
  uploadDisabled: false,
});

const uploadHandler = shallowRef<UploadHandler | undefined>(undefined);

// 初始化计算hash的参数
function initCalcHash() {
  uploadState.hashPercentage = 0;
  uploadState.uploadDisabled = false;
}
// 上传文件请求处理
async function handleUpload(file: File) {
  uploadState.uploadDisabled = true;

  const { startHash, endHash, fileHash } = await calculateHash(file);
  initCalcHash();

  const listItem = uploadState.list.find((item) => item.fileHash === fileHash);
  if (listItem) {
    ElMessage({ message: '该文件正在上传中，无需重复上传', type: 'warning' });
    return;
  }

  const { uploadedList, fileRecordId } = await verifyFile(
    file.name,
    fileHash,
    startHash,
    endHash,
    file.size,
  );

  if (uploadedList && fileRecordId) {
    const uploadFileRecordData = ref(
      await getUploadFileRecordData(fileRecordId, file, uploadedList),
    );
    uploadState.list.push(uploadFileRecordData.value);

    await startUpload();
  }
}

// 开始上传
async function startUpload() {
  if (uploadHandler.value) {
    return;
  }
  const uploadFileRecordData = uploadState.list[0];
  if (!uploadFileRecordData) {
    return;
  }

  try {
    uploadHandler.value = new UploadHandler(
      uploadFileRecordData.file,
      uploadFileRecordData.fileHash,
      uploadFileRecordData.uploadedList,
    );
  } catch (e) {
    if (e instanceof Error) {
      ElMessage({ message: e.message, type: 'error' });
    }
    throw e;
  }

  uploadHandler.value.on('close', async (isDone) => {
    uploadHandler.value = undefined;

    if (isDone) {
      await afterUploaded(uploadFileRecordData);
    } else {
      ElMessage({
        message: '上传失败，未知异常',
        type: 'error',
      });
    }
  });
  uploadHandler.value.on('percentage', async (percentage) => {
    uploadFileRecordData.percentage = percentage;
  });

  // 开始上传
  uploadFileRecordData.uploadStatus = UploadStatusEnum.UPLOADING;
  uploadHandler.value.upload();
}

// 上传完成后的处理
async function afterUploaded(uploadFileRecordData: UnwrapRef<ListItem>) {
  const { uploadedList: checkUploadedList } = await verifyFile(
    uploadFileRecordData.filename,
    uploadFileRecordData.fileHash,
    uploadFileRecordData.startHash,
    uploadFileRecordData.endHash,
    uploadFileRecordData.size,
  );
  // 上传文件列表移除已上传的文件
  uploadState.list = uploadState.list.filter(
    (item) => item.fileHash !== uploadFileRecordData.fileHash,
  );

  if (checkUploadedList?.length === uploadFileRecordData.chunkCount) {
    ElMessage({ message: '上传文件成功', type: 'success' });

    await getList();
    // 合并切片请求
    await mergeChunkApi({
      fileHash: uploadFileRecordData.fileHash,
      size: uploadFileRecordData.size,
    });
    const fileRecordData = listState.list.find(
      (item) => item.fileHash === uploadFileRecordData.fileHash,
    );
    if (fileRecordData) {
      fileRecordData.status = FileStatusEnum.CHUNK_MERGING;
    }
  } else {
    ElMessage({ message: '未知原因，上传切片不成功', type: 'error' });
  }

  await startUpload();
}

// 暂停上传
async function handlePause(uploadFileRecordData: ListItem) {
  uploadFileRecordData.uploadStatus = UploadStatusEnum.PAUSE;

  uploadHandler.value?.pause();
}
// 恢复上传
async function handleResume(uploadFileRecordData: ListItem) {
  uploadFileRecordData.uploadStatus = UploadStatusEnum.UPLOADING;

  await uploadHandler.value?.resume();
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
function createFileChunk(file: File, size = 5 * 1024 * 1024): FileChunkItem[] {
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
function calculateHash(file: File): Promise<{
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
    const fileChunkList = createFileChunk(file);
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

// 获取文件详情信息
async function getUploadFileRecordData(
  fileRecordId: number,
  file: File,
  uploadedList: string[],
): Promise<ListItem> {
  const fileRecordData = await fileRecordDetailApi(fileRecordId);
  if (!fileRecordData) {
    ElMessage({
      message: '文件记录不存在',
      type: 'error',
    });
    throw new Error('文件记录不存在');
  }
  return {
    ...fileRecordData,
    loading: false,
    file,
    chunkCount: Math.ceil(fileRecordData.size / FileConfigEnum.SIZE),
    uploadStatus: UploadStatusEnum.WAIT,
    percentage: 0,
    uploadedList,
  };
}

export function useUpload() {
  return {
    uploadState,
    uploadHandler,
    handleUpload,
    handlePause,
    handleResume,
  };
}
