<template>
  <el-card header="正在上传的文件" shadow="never" body-style="padding: 6px;">
    <el-form :size="configStore.size">
      <el-card
        class="mb10 ml10 mr10"
        v-for="(item, idx) in uploadState.list"
        :key="item.fileHash"
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
              <el-col
                v-if="item.status === FileStatusEnum.CHUNK_UPLOADING"
                :span="6"
              >
                <el-form-item label="上传进度">
                  {{ item.uploadedCount || 0 }}/{{ item.chunkCount || 0 }}
                </el-form-item>
              </el-col>
            </el-row>
          </el-col>

          <el-col :span="4">
            <el-row
              v-if="item.uploadStatus === UploadStatusEnum.UPLOADING"
              justify="end"
              class="mt10"
            >
              <el-button
                type="warning"
                :size="configStore.size"
                @click="handlePause(item)"
              >
                暂停上传
              </el-button>
            </el-row>
            <el-row
              v-else-if="item.uploadStatus === UploadStatusEnum.PAUSE"
              justify="end"
              class="mt10"
            >
              <el-button
                type="primary"
                :size="configStore.size"
                @click="handleResume(item)"
              >
                恢复上传
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
import FileStatus from './FileStatus.vue';
import FileCheckStatus from './FileCheckStatus.vue';
import { deleteFileApi, FileRecordData } from '@src/http/apis';
import { ElMessage } from 'element-plus/es';
import { FileStatusEnum, UploadStatusEnum } from '@src/enums';
import { useUpload } from '@src/pages/home/composables';
import { useConfigStore } from '@src/store';

const { uploadState, handlePause, handleResume } = useUpload();
const configStore = useConfigStore();

// 删除文件记录
async function del(fileRecordData: FileRecordData, idx: number) {
  await deleteFileApi(fileRecordData.id);

  ElMessage({
    message: '删除文件成功',
    type: 'success',
  });
  uploadState.list.splice(idx, 1);
}
</script>

<style lang="scss" scoped></style>
