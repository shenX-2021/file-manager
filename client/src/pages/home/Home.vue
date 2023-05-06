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
    </div>
    <upload-list v-show="uploadState.list.length > 0" class="mt10" />
    <record-list class="mt10" />
  </div>
</template>

<script setup lang="ts">
import RecordList from '@src/pages/home/components/RecordList.vue';
import { useUpload } from '@src/pages/home/composables';
import UploadList from '@src/pages/home/components/UploadList.vue';

const { uploadState, handleUpload, initUploadState } = useUpload();

// 上传的文件改动
function handleFileChange(file: File) {
  if (!file) return;
  initUploadState();
  handleUpload(file);
  return false;
}
</script>

<style lang="scss" scoped>
.upload {
  width: 90vw;
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
