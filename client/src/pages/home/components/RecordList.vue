<template>
  <el-card header="文件列表" shadow="never" body-style="padding: 6px;">
    <div v-if="listState.list.length === 0" class="flexCenter w100per h100">
      当前没有文件
    </div>
    <el-form v-else :size="configStore.size">
      <el-card
        class="mb10"
        v-for="(item, idx) in listState.list"
        :key="idx"
        v-loading="listState.list[idx].loading"
      >
        <el-row>
          <el-col :span="17">
            <el-row v-for="(cols, rowIdx) in rows" :key="rowIdx">
              <el-col v-for="(col, colIdx) in cols" :key="colIdx" :span="span">
                <el-form-item :label="col.label">
                  <template v-if="col.type === 'component'">
                    <file-status
                      v-if="col.prop === 'status'"
                      :status="item[col.prop]"
                      :file-hash="item.fileHash"
                      :size="item.size"
                      @after-merge="update(item)"
                    />
                    <component
                      v-else
                      :is="col.component"
                      :[col.model]="item[col.prop]"
                    />
                  </template>
                  <span v-else-if="col.type === 'value'" v-bind="col.props">
                    {{ col.getValue(item[col.prop]) }}
                  </span>
                  <span v-else-if="col.type === 'prop'" v-bind="col.props">
                    {{ item[col.prop] }}
                  </span>
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>

          <el-col :span="7">
            <el-row
              justify="end"
              v-if="item.status === FileStatusEnum.FINISHED"
            >
              <el-button
                type="primary"
                :size="configStore.size"
                @click="check(item, idx)"
              >
                {{
                  item.checkStatus === FileCheckStatusEnum.UNCHECKED
                    ? '校验文件'
                    : '重新校验'
                }}
              </el-button>
            </el-row>
            <el-row
              justify="end"
              class="mt10"
              v-if="item.status === FileStatusEnum.CHUNK_UPLOADED"
            >
              <el-button
                type="primary"
                :size="configStore.size"
                @click="mergeChunk(item)"
              >
                合并切片
              </el-button>
            </el-row>
            <el-row
              justify="end"
              class="mt10"
              v-if="item.status === FileStatusEnum.CHUNK_MERGING"
            >
              <el-button
                type="danger"
                :size="configStore.size"
                @click="cancelMergeChunk(item)"
              >
                取消合并
              </el-button>
            </el-row>
            <el-row
              justify="end"
              class="mt10"
              v-if="item.status === FileStatusEnum.FINISHED"
            >
              <el-button
                type="info"
                :size="configStore.size"
                @click="downloadFile(item)"
              >
                下载
              </el-button>
            </el-row>
            <el-row justify="end" class="mt10">
              <el-button
                type="danger"
                :size="configStore.size"
                @click="del(item, idx)"
              >
                删除
              </el-button>
            </el-row>
          </el-col>
        </el-row>
      </el-card>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { useList } from '@src/pages/home/composables';
import {
  cancelMergeChunkApi,
  checkFileApi,
  deleteFileApi,
  FileRecordData,
  fileRecordDetailApi,
  mergeChunkApi,
} from '@src/http/apis';
import { ElMessage } from 'element-plus/es';
import { FileCheckStatusEnum, FileStatusEnum } from '@src/enums';
import { download, transformByte } from '@src/utils';
import { ElMessageBox } from 'element-plus';
import { useConfigStore } from '@src/store';
import { computed, defineAsyncComponent } from 'vue';
import FileStatus from '@src/pages/home/components/FileStatus.vue';

const { listState, getList } = useList();
const configStore = useConfigStore();

// 校验文件
async function check(fileRecordData: FileRecordData, idx: number) {
  listState.list[idx].loading = true;
  try {
    const res = await checkFileApi(fileRecordData.id);

    fileRecordData.checkStatus = res.checkStatus;
    if (res.checkStatus === FileCheckStatusEnum.SUCCESSFUL) {
      ElMessage({
        message: '文件已通过校验',
        type: 'success',
      });
    } else {
      ElMessage({
        message: '文件未通过校验',
        type: 'error',
      });
    }
  } finally {
    listState.list[idx].loading = false;
  }
}

// 下载文件
async function downloadFile(fileRecordData: FileRecordData) {
  await download(fileRecordData.id, fileRecordData.filename);
}

// 删除文件记录
async function del(fileRecordData: FileRecordData, idx: number) {
  try {
    listState.list[idx].loading = true;
    await ElMessageBox.confirm(`是否删除文件【${fileRecordData.filename}】`, {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    });

    await deleteFileApi(fileRecordData.id);

    ElMessage({
      message: '删除文件成功',
      type: 'success',
    });
    listState.list.splice(idx, 1);
  } finally {
    listState.list[idx].loading = false;
  }
}

// 更新文件记录
async function update(fileRecordData: FileRecordData) {
  const newFileRecordData = await fileRecordDetailApi(fileRecordData.id);
  // 数据库的记录不存在
  if (!newFileRecordData) {
    ElMessage({
      message: `文件【${fileRecordData.filename}】已被移除`,
      type: 'error',
    });
    const index = listState.list.findIndex(
      (item) => (item.id = fileRecordData.id),
    );
    if (index !== -1) {
      listState.list.splice(index, 1);
    }
    return;
  }
  newFileRecordData.loading = false;

  Object.assign(fileRecordData, newFileRecordData);
}

// 合并切片
async function mergeChunk(fileRecordData: FileRecordData) {
  // 合并切片请求
  await mergeChunkApi({
    fileHash: fileRecordData.fileHash,
    size: fileRecordData.size,
  });

  fileRecordData.status = FileStatusEnum.CHUNK_MERGING;
}

// 取消合并切片
async function cancelMergeChunk(fileRecordData: FileRecordData) {
  try {
    fileRecordData.loading = true;
    // 合并切片请求
    await cancelMergeChunkApi(fileRecordData.id);

    fileRecordData.status = FileStatusEnum.CHUNK_UPLOADED;
  } finally {
    fileRecordData.loading = false;
  }
}

const formItemList: FormItem[] = [
  {
    type: 'prop',
    label: '文件名',
    prop: 'filename',
    props: {
      class: 'singe-line-ellipsis',
    },
  },
  {
    type: 'value',
    label: '创建时间',
    prop: 'gmtCreated',
    getValue: (value: string) => new Date(value).toLocaleString(),
  },
  {
    type: 'component',
    label: '上传状态',
    prop: 'status',
    model: 'status',
    component: defineAsyncComponent(() => import('./FileStatus.vue')),
  },
  {
    type: 'component',
    label: '校验状态',
    prop: 'checkStatus',
    model: 'checkStatus',
    component: defineAsyncComponent(() => import('./FileCheckStatus.vue')),
  },
  {
    type: 'value',
    label: '文件大小',
    prop: 'size',
    getValue: (value: number) => transformByte(value),
  },
];

const rows = computed<FormItem[][]>(() => {
  if (configStore.size === 'small') {
    return formItemList.map((item) => [item]);
  }

  const step = configStore.size === 'default' ? 2 : 4;

  const list: FormItem[][] = [];
  for (let i = 0; i < formItemList.length; i += step) {
    list.push(formItemList.slice(i, i + step));
  }

  return list;
});

const span = computed(() => {
  if (configStore.size === 'small') return 24;

  if (configStore.size === 'default') return 12;

  return 6;
});

async function onCreated() {
  await getList();
}
onCreated();
</script>

<style lang="scss" scoped></style>
