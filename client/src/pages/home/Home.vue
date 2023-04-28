<template>
  <div class="home">
    <div>
      <input
        type="file"
        :disabled="state.status !== UploadStatusEnum.WAIT"
        multiple
        @change="handleFileChange"
      />
      <el-button @click="handleUpload" :disabled="uploadDisabled">
        upload
      </el-button>
      <el-button
        @click="handleResume"
        v-if="state.status === UploadStatusEnum.PAUSE"
      >
        resume
      </el-button>
      <el-button
        v-else
        :disabled="
          state.status !== UploadStatusEnum.UPLOADING || !state.container.hash
        "
        @click="handlePause"
      >
        pause
      </el-button>
      <el-button @click="handleDelete">delete</el-button>
    </div>
    <div>
      <div>
        <div>calculate chunk hash</div>
        <el-progress :percentage="state.hashPercentage" />
      </div>
      <div>
        <div>percentage</div>
        <el-progress :percentage="uploadPercentage" />
      </div>
    </div>
    <el-table :data="state.data">
      <el-table-column prop="hash" label="chunk hash" align="center" />
      <el-table-column label="size(KB)" align="center" width="120">
        <template #default="{ row }">
          {{ transformByte(row.size | 0) }}
        </template>
      </el-table-column>
      <el-table-column label="percentage" align="center">
        <template #default="{ row }">
          <el-progress :percentage="row.percentage" color="#909399" />
        </template>
      </el-table-column>
    </el-table>
    <record-list class="mt10" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import {
  changeFilenameApi,
  mergeChunkApi,
  verifyFileApi,
} from '@src/http/apis';
import { ElMessage, ElMessageBox } from 'element-plus/es';
import { UploadStatusEnum } from '@src/enums';
import RecordList from '@src/pages/home/components/RecordList.vue';
import pLimit from 'p-limit';
import { useList } from '@src/pages/home/composables';

// 切片大小
const SIZE = 30 * 1024 * 1024;

interface RequestOpts {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  onProgress?: (this: XMLHttpRequest, ev: ProgressEvent) => any;
  onError?: (message: string) => any;
  requestList?: XMLHttpRequest[];
}
interface State {
  container: {
    file?: File;
    hash?: string;
    worker?: Worker;
    startHash?: string;
    endHash?: string;
  };
  hashPercentage: number;
  data: {
    fileHash: string;
    index: number;
    hash: string;
    chunk: Blob;
    size: number;
    percentage: number;
  }[];
  requestList: XMLHttpRequest[];
  status: UploadStatusEnum;
}
const state = reactive<State>({
  container: {
    file: undefined,
    hash: '',
    worker: undefined,
  },
  hashPercentage: 0,
  data: [],
  requestList: [],
  status: UploadStatusEnum.WAIT,
});
const { listState } = useList();

function initState() {
  state.container = {
    file: undefined,
    hash: '',
    worker: undefined,
  };
  state.hashPercentage = 0;
  state.data = [];
  state.requestList = [];
  state.status = UploadStatusEnum.WAIT;
}

function transformByte(val: number) {
  return Number((val / 1024).toFixed(0));
}

// 上传按钮禁用状态
const uploadDisabled = computed(
  () =>
    !state.container.file ||
    (
      [UploadStatusEnum.PAUSE, UploadStatusEnum.UPLOADING] as UploadStatusEnum[]
    ).includes(state.status),
);
// 上传进度条
const uploadPercentage = computed(() => {
  if (!state.container.file || !state.data.length) return 0;
  const loaded = state.data
    .map((item) => item.size * item.percentage)
    .reduce((acc, cur) => acc + cur, 0);
  return parseInt((loaded / state.container.file.size).toFixed(2));
});

// 删除
async function handleDelete() {
  const { data } = await request({
    url: 'http://192.168.0.19:3000/delete',
  });
  if (JSON.parse(data).code === 0) {
    ElMessage({
      message: '删除成功',
      type: 'success',
    });
  }
}
// 暂停
async function handlePause() {
  state.status = UploadStatusEnum.PAUSE;
  await resetData();
}
// 重置数据
async function resetData() {
  state.requestList.forEach((xhr) => xhr?.abort());
  state.requestList = [];
  if (state.container.worker) {
    state.container.worker.onmessage = null;
  }
}
// 恢复上传
async function handleResume() {
  state.status = UploadStatusEnum.UPLOADING;
  const uploadedList = await verifyFile();

  if (uploadedList) {
    await uploadChunks(uploadedList);
  }
}
// 验证文件信息
async function verifyFile(): Promise<string[] | undefined> {
  if (!state.container.file || !state.container.hash) return;
  if (!state.container.startHash || !state.container.endHash) return;
  let filename = state.container.file.name;

  let res = await verifyFileApi({
    filename: filename,
    fileHash: state.container.hash,
    startHash: state.container.startHash,
    endHash: state.container.endHash,
    size: state.container.file.size,
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
      fileHash: state.container.hash,
      startHash: state.container.startHash,
      endHash: state.container.endHash,
      size: state.container.file.size,
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
      state.status = UploadStatusEnum.WAIT;
      initState();
      return;
    }
    const { uploadedList } = res.data;

    // 计算每个切片的上传进度
    const map: Record<string, 100> = {};
    uploadedList?.forEach((chunkName) => {
      map[chunkName] = 100;
    });
    state.data.forEach((item) => {
      item.percentage = map[item.index] || 0;
    });

    return uploadedList;
  }
}
// 请求处理
function request({
  url,
  method,
  data,
  headers = {},
  onProgress,
  onError,
  requestList,
}: RequestOpts): any {
  return new Promise((resolve) => {
    method = method || 'post';
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = onProgress || null;
    xhr.open(method, url);
    Object.values(headers).forEach(([key, value]) =>
      xhr.setRequestHeader(key, value),
    );
    xhr.send(data);
    xhr.onload = () => {
      // 将请求成功的 xhr 从列表中删除
      // remove xhr which status is success
      if (requestList) {
        const xhrIndex = requestList.findIndex((item) => item === xhr);
        requestList.splice(xhrIndex, 1);
      }

      if (xhr.status === 413) {
        onError && onError('大小超过了限制，请检查服务器的限制');
      } else {
        resolve(1);
      }
    };
    // 暴露当前 xhr 给外部
    // export xhr
    requestList?.push(xhr);
  });
}
// 生成文件切片
function createFileChunk(file: File, size = SIZE): Blob[] {
  const fileChunkList: Blob[] = [];
  let cur = 0;
  while (cur < file.size) {
    fileChunkList.push(file.slice(cur, cur + size));
    cur += size;
  }
  return fileChunkList;
}
// 生成文件hash
function calculateHash(fileChunkList: Blob[]): Promise<string> {
  return new Promise(async (resolve) => {
    const file = state.container.file;
    if (!file) return;

    const length = SIZE >= file.size ? file.size : SIZE;
    let startHash = await calculateBlobHash(file.slice(0, length));
    let endHash = await calculateBlobHash(file.slice(-length));
    state.container.startHash = startHash;
    state.container.endHash = endHash;

    const hashData = listState.list.find(
      (item) =>
        item.startHash === startHash &&
        item.endHash === endHash &&
        item.size === file.size,
    );
    if (hashData) {
      state.hashPercentage = 100;
      resolve(hashData.fileHash);
    } else {
      // 计算整个文件的hash值
      state.container.worker = new Worker('./hash.js');
      state.container.worker.postMessage({ fileChunkList });
      state.container.worker.onmessage = (e) => {
        const { percentage, hash } = e.data;

        state.hashPercentage = percentage;
        if (hash) {
          resolve(hash);
        } else {
          // TODO: 计算hash失败的处理
        }
      };
    }
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
// 上传的文件改动
function handleFileChange(e: any) {
  const [file] = e.target.files;
  if (!file) return;
  resetData();
  initState();
  state.container.file = file;
}

// 上传文件请求处理
async function handleUpload() {
  if (!state.container.file) return;
  state.status = UploadStatusEnum.UPLOADING;
  const fileChunkList = createFileChunk(state.container.file);
  state.container.hash = await calculateHash(fileChunkList);

  state.data = fileChunkList.map((file, index) => ({
    fileHash: state.container.hash ?? '',
    index,
    hash: state.container.hash + '-' + index,
    chunk: file,
    size: file.size,
    percentage: 0,
  }));

  const uploadedList = await verifyFile();

  if (uploadedList) {
    await uploadChunks(uploadedList);
  }
}
// 上传文件切片
async function uploadChunks(uploadedList: string[] = []) {
  if (!state.container.file || !state.container.hash) return;
  const file = state.container.file;
  const fileHash = state.container.hash;
  const limit = pLimit(6);
  const uploadList = state.data
    .filter(({ index }) => !uploadedList.includes(index.toString()))
    .map(({ chunk, index }) => {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('chunkIndex', index.toString());
      formData.append('filename', file.name);
      formData.append('fileHash', fileHash);
      formData.append('size', file.size.toString());
      return { formData, index };
    })
    .map(({ formData, index }) =>
      limit(() =>
        request({
          url: '/fm/api/file/upload',
          data: formData,
          onProgress: createProgressHandler(state.data[index]),
          onError: createErrorHandler(state.data[index]),
          requestList: state.requestList,
        }),
      ),
    );
  await Promise.all(uploadList);

  const checkUploadedList = await verifyFile();
  if (checkUploadedList?.length === Math.ceil(file.size / SIZE)) {
    // 合并切片请求
    await mergeChunkApi({
      fileHash: state.container.hash,
      size: state.container.file.size,
    });

    ElMessage({ message: '上传文件成功', type: 'success' });
    initState();
  } else {
    ElMessage({ message: '未知原因，上传切片不成功', type: 'error' });
  }
}
// 用闭包保存每个 chunk 的进度数据
function createProgressHandler(item) {
  return (e) => {
    item.percentage = parseInt(String((e.loaded / e.total) * 100));
  };
}
// 用闭包保存每个 chunk 的失败后的处理
function createErrorHandler(item) {
  return (message: string) => {
    item.percentage = 0;
    ElMessage({
      type: 'error',
      message,
    });
    throw new Error('大小超过了限制，请检查服务器的限制');
  };
}
</script>

<style lang="scss"></style>
