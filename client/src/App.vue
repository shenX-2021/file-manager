<template>
  <div id="app">
    <div>
      <input
        type="file"
        :disabled="state.status !== Status.wait"
        multiple
        @change="handleFileChange"
      />
      <el-button @click="handleUpload" :disabled="uploadDisabled">
        upload
      </el-button>
      <el-button @click="handleResume" v-if="state.status === Status.pause">
        resume
      </el-button>
      <el-button
        v-else
        :disabled="state.status !== Status.uploading || !state.container.hash"
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
        <el-progress :percentage="state.fakeUploadPercentage" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
  changeFilenameApi,
  mergeChunkApi,
  verifyFileApi,
} from '@src/http/apis';
import { hashList } from '@src/utils';
import { ElMessage, ElMessageBox } from 'element-plus/es';

// 切片大小
const SIZE = 30 * 1024 * 1024;

enum Status {
  wait = 'wait',
  pause = 'pause',
  uploading = 'uploading',
}

interface RequestOpts {
  url: string;
  method?: string;
  data?: any;
  headers?: Record<string, string>;
  onProgress?: (this: XMLHttpRequest, ev: ProgressEvent) => any;
  requestList?: XMLHttpRequest[];
}
interface State {
  container: {
    file?: File;
    hash?: string;
    worker?: Worker;
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
  status: Status;
  fakeUploadPercentage: number;
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
  status: Status.wait,
  // 当暂停时会取消 xhr 导致进度条后退
  // 为了避免这种情况，需要定义一个假的进度条
  // use fake progress to avoid progress backwards when upload is paused
  fakeUploadPercentage: 0,
});

function initState() {
  state.container = {
    file: undefined,
    hash: '',
    worker: undefined,
  };
  state.hashPercentage = 0;
  state.data = [];
  state.requestList = [];
  state.status = Status.wait;
  state.fakeUploadPercentage = 0;
}

function transformByte(val: number) {
  return Number((val / 1024).toFixed(0));
}

// 上传按钮禁用状态
const uploadDisabled = computed(
  () =>
    !state.container.file ||
    ([Status.pause, Status.uploading] as Status[]).includes(state.status),
);
// 上传进度条
const uploadPercentage = computed(() => {
  if (!state.container.file || !state.data.length) return 0;
  const loaded = state.data
    .map((item) => item.size * item.percentage)
    .reduce((acc, cur) => acc + cur, 0);
  return parseInt((loaded / state.container.file.size).toFixed(2));
});

watch(
  () => uploadPercentage.value,
  (now) => {
    if (now > state.fakeUploadPercentage) {
      state.fakeUploadPercentage = now;
    }
  },
);

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
  state.status = Status.pause;
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
  state.status = Status.uploading;
  const uploadedList = await verifyFile();

  if (uploadedList) {
    await uploadChunks(uploadedList);
  }
}
// 验证文件信息
async function verifyFile(): Promise<string[] | undefined> {
  if (!state.container.file || !state.container.hash) return;
  let filename = state.container.file.name;

  let res = await verifyFileApi({
    filename: filename,
    fileHash: state.container.hash,
    size: state.container.file.size,
  });
  if (res.code === 1) {
    const { originFileName, id } = res.data;
    await ElMessageBox.confirm(
      `文件名【${filename}】与服务器存档的文件名【${originFileName}】不符，是否需要修改名字`,
    )
      .then(async () => {
        await changeFilenameApi(id, { filename });
      })
      .catch((e) => {
        if (e !== 'cancel') {
          throw e;
        }
        filename = originFileName;
      });

    res = await verifyFileApi({
      filename,
      fileHash: state.container.hash,
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
      state.status = Status.wait;
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
    xhr.onload = (e: any) => {
      // 将请求成功的 xhr 从列表中删除
      // remove xhr which status is success
      if (requestList) {
        const xhrIndex = requestList.findIndex((item) => item === xhr);
        requestList.splice(xhrIndex, 1);
      }
      resolve({
        data: e.target?.response,
      });
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

    const hashData = hashList.find(startHash, endHash, file.size);
    if (hashData) {
      state.hashPercentage = 100;
      resolve(hashData.hash);
    } else {
      // 计算整个文件的hash值
      state.container.worker = new Worker('/hash.js');
      state.container.worker.postMessage({ fileChunkList });
      state.container.worker.onmessage = (e) => {
        const { percentage, hash } = e.data;

        state.hashPercentage = percentage;
        if (hash) {
          hashList.add({
            hash,
            startHash,
            endHash,
            size: file.size,
          });
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
  state.status = Status.uploading;
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
  const requestList = state.data
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
      request({
        url: '/fm/file/upload',
        data: formData,
        onProgress: createProgressHandler(state.data[index]),
        requestList: state.requestList,
      }),
    );
  await Promise.all(requestList);

  // 合并切片请求
  await mergeChunkApi({
    fileHash: state.container.hash,
    size: state.container.file.size,
  });

  ElMessage({ message: '上传文件成功', type: 'success' });
  initState();
}
// 用闭包保存每个 chunk 的进度数据
function createProgressHandler(item) {
  return (e) => {
    item.percentage = parseInt(String((e.loaded / e.total) * 100));
  };
}
</script>

<style lang="scss">
.app {
  color: blue;
}
</style>
