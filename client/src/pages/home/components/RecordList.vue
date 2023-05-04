<template>
  <el-card header="文件列表" shadow="never" body-style="padding: 6px;">
    <div v-if="listState.list.length === 0" class="flexCenter w100per h100">
      当前没有文件
    </div>
    <el-form v-else>
      <el-card
        class="mb10 ml4 mr4"
        v-for="(item, idx) in listState.list"
        :key="idx"
        v-loading="listState.loadingList[idx]"
      >
        <el-row>
          <el-col :span="20">
            <el-row>
              <el-col :span="6">
                <el-form-item label="名称">
                  {{ item.filename }}
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="上传状态">
                  <file-status :status="item.status" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="校验状态">
                  <file-check-status :check-status="item.checkStatus" />
                </el-form-item>
              </el-col>
              <el-col :span="6">
                <el-form-item label="创建时间">
                  {{ new Date(item.gmtCreated).toLocaleString() }}
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="6">
                <el-form-item label="文件大小">
                  {{ item.size }}
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>

          <el-col :span="4">
            <el-row
              justify="end"
              v-if="item.status === FileStatusEnum.FINISHED"
            >
              <el-button type="primary" @click="check(item, idx)">
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
              v-if="item.status === FileStatusEnum.FINISHED"
            >
              <el-button type="info" @click="downloadFile(item)">
                下载
              </el-button>
            </el-row>
            <el-row justify="end" class="mt10">
              <el-button type="danger" @click="del(item, idx)">
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
import FileStatus from './FileStatus.vue';
import FileCheckStatus from './FileCheckStatus.vue';
import { checkFileApi, deleteFileApi, FileRecordData } from '@src/http/apis';
import { ElMessage } from 'element-plus/es';
import { FileCheckStatusEnum, FileStatusEnum } from '@src/enums';
import { download } from '@src/utils';
import { ElMessageBox } from 'element-plus';

const { listState, getList } = useList();

// 校验文件
async function check(fileRecordData: FileRecordData, idx: number) {
  listState.loadingList[idx] = true;
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
    listState.loadingList[idx] = false;
  }
}

// 下载文件
async function downloadFile(fileRecordData: FileRecordData) {
  await download(fileRecordData.id, fileRecordData.filename);
}

// 删除文件记录
async function del(fileRecordData: FileRecordData, idx: number) {
  try {
    listState.loadingList[idx] = true;
    await ElMessageBox.confirm(`是否删除文件【${fileRecordData.filename}】`, {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    });

    await deleteFileApi(fileRecordData.id);

    ElMessage({
      message: '删除文件成功',
      type: 'success',
    });
    listState.loadingList.splice(idx, 1);
    listState.list.splice(idx, 1);
  } finally {
    listState.loadingList[idx] = false;
  }
}

async function onCreated() {
  await getList();
}
onCreated();
</script>

<style lang="scss" scoped></style>
