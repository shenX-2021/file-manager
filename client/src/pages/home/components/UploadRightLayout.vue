<template>
  <template v-if="configStore.state.size === 'small'">
    <el-row justify="center">
      <el-progress
        type="circle"
        :percentage="props.fileRecordData.percentage"
      />
    </el-row>
    <el-row justify="center" class="mt12">
      <el-col
        v-if="props.fileRecordData.uploadStatus === UploadStatusEnum.UPLOADING"
        :span="12"
        class="flexCenter"
      >
        <el-button type="warning" @click="handlePause(props.fileRecordData)">
          暂停
        </el-button>
      </el-col>
      <el-col
        v-else-if="props.fileRecordData.uploadStatus === UploadStatusEnum.PAUSE"
        :span="12"
        class="flexCenter"
      >
        <el-button type="primary" @click="handleResume(props.fileRecordData)">
          恢复
        </el-button>
      </el-col>
      <el-col :span="12" class="flexCenter">
        <el-button type="danger" @click="del"> 删除 </el-button>
      </el-col>
    </el-row>
  </template>
  <el-row v-else>
    <el-col :span="14">
      <el-progress
        type="circle"
        :percentage="props.fileRecordData.percentage"
      />
    </el-col>
    <el-col :span="10">
      <el-row
        v-if="props.fileRecordData.uploadStatus === UploadStatusEnum.UPLOADING"
        justify="end"
      >
        <el-button type="warning" @click="handlePause(props.fileRecordData)">
          暂停
        </el-button>
      </el-row>
      <el-row
        v-else-if="props.fileRecordData.uploadStatus === UploadStatusEnum.PAUSE"
        justify="end"
      >
        <el-button type="primary" @click="handleResume(props.fileRecordData)">
          恢复
        </el-button>
      </el-row>
      <el-row justify="end" class="mt10">
        <el-button type="danger" @click="del"> 删除 </el-button>
      </el-row>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { UploadStatusEnum } from '@src/enums';
import { useConfigStore } from '@src/store';
import { deleteFileApi } from '@src/http/apis';
import { ListItem, useUpload } from '@src/pages/home/composables';
import { ElMessage } from 'element-plus';

const props = defineProps<{
  fileRecordData: ListItem;
  index: number;
}>();

const { uploadState, uploadHandler, handlePause, handleResume } = useUpload();
const configStore = useConfigStore();

// 删除文件记录
async function del() {
  await uploadHandler.value?.close();
  await deleteFileApi(props.fileRecordData.id);

  ElMessage({
    message: '删除文件成功',
    type: 'success',
  });
  uploadState.list.splice(props.index, 1);
}
</script>

<style scoped lang="scss"></style>
