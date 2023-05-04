<template>
  <div class="home">
    <div>
      <input
        type="file"
        :disabled="uploadState.uploadDisabled"
        multiple
        @change="handleFileChange"
      />
    </div>
    <div>
      <div>
        <div>calculate chunk hash</div>
        <el-progress :percentage="uploadState.hashPercentage" />
      </div>
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
function handleFileChange(e: any) {
  const [file] = e.target.files;
  if (!file) return;
  initUploadState();
  handleUpload(file);
}
</script>

<style lang="scss"></style>
