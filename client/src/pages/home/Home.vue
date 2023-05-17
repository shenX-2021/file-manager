<template>
  <div class="home">
    <div class="flexCenter mt10">
      <el-upload
        class="upload"
        drag
        :before-upload="handleFileChange"
        :disabled="uploadState.uploadDisabled"
      >
        <div
          v-show="!uploadState.uploadDisabled"
          class="el-upload__text w100per h100per flexCenter"
        >
          拖拽上传 或 <em>点击上传</em>
        </div>

        <el-progress
          v-show="uploadState.uploadDisabled"
          class="progress flexCenter w100per h100per"
          :show-text="false"
          :stroke-width="150"
          :percentage="uploadState.hashPercentage"
        />

        <div
          v-show="uploadState.uploadDisabled"
          class="progress-text w100per h100per flexCenter"
        >
          <div>
            <div class="fs26 pl4">{{ uploadState.hashPercentage }}%</div>
            <div class="fs14 mt12">计算文件Hash中...</div>
          </div>
        </div>
      </el-upload>
      <div class="ml10">
        <div @click="isShowConfig = true">设置</div>
        <div class="mt10" @click="logout">登出</div>
      </div>
    </div>
    <upload-list v-show="uploadState.list.length > 0" class="mt10" />
    <record-list class="mt10" />
    <config-dialog v-model:is-show="isShowConfig" />
  </div>
</template>

<script setup lang="ts">
import RecordList from '@src/pages/home/components/RecordList.vue';
import { useList, useUpload } from '@src/pages/home/composables';
import UploadList from '@src/pages/home/components/UploadList.vue';
import { UploadStatusEnum } from '@src/enums';
import ConfigDialog from '@src/pages/home/components/ConfigDialog.vue';
import { ref } from 'vue';
import { getConfigApi, logoutApi } from '@src/http/apis';
import { useConfigStore } from '@src/store';
import { useRouter } from 'vue-router';

const router = useRouter();
const { uploadState, handleUpload } = useUpload();
const { listState } = useList();
const configStore = useConfigStore();

const isShowConfig = ref(false);

// 上传的文件改动
function handleFileChange(file: File) {
  if (!file) return;
  handleUpload(file);
  return false;
}

// 登出
async function logout() {
  await logoutApi();
  await router.push({ name: 'Login' });
}

window.onbeforeunload = () => {
  // 是否正在计算hash
  const isCalcHash =
    uploadState.hashPercentage !== 0 || uploadState.uploadDisabled;
  if (isCalcHash) return isCalcHash;
  // 判断上传文件列表中是否有任务在处理中
  const isUploadLoading = uploadState.list.some(
    (item) => item.uploadStatus === UploadStatusEnum.UPLOADING,
  );
  if (isUploadLoading) return isUploadLoading;
  // 判断文件列表是否有任务在处理中
  const isListLoading = listState.list.some((item) => item.loading);
  if (isListLoading) return isListLoading;

  return isListLoading || isUploadLoading || null;
};

async function onCreated() {
  const configData = await getConfigApi();
  configStore.initConfig(configData);
}
onCreated();
</script>

<style lang="scss" scoped>
.upload {
  width: 86vw;
  height: 150px;
  position: relative;
  font-size: 1vw;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    padding: 0;
    height: 100%;
    width: 100%;
  }

  .progress {
    position: absolute;
    top: 0;
    left: 0;

    :deep(.el-progress-bar__outer),
    :deep(.el-progress-bar__inner) {
      border-radius: inherit;
    }
  }
  .progress-text {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 101;
    color: var(--el-color-black);
    cursor: progress;
    user-select: none;
  }
}
</style>
