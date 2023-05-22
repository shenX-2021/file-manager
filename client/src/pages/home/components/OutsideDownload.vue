<template>
  <el-switch
    :model-value="props.modelValue"
    :active-value="1"
    active-text="启用"
    :inactive-value="0"
    inactive-text="禁用"
    inline-prompt
    :disabled="props.fileRecordData.status !== FileStatusEnum.FINISHED"
    @change="onChange"
  />
  <el-button
    v-show="
      props.modelValue === 1 &&
      props.fileRecordData.status === FileStatusEnum.FINISHED
    "
    class="ml12"
    type="primary"
    size="small"
    @click="copyText"
  >
    复制链接
  </el-button>
</template>

<script setup lang="ts">
import { FileRecordData, updateOutsideDownloadApi } from '@src/http/apis';
import { FileStatusEnum } from '@src/enums';
import { copy } from '@src/utils';
import { ElMessage } from 'element-plus/es';

const props = defineProps<{
  fileRecordData: FileRecordData;
  modelValue: 0 | 1;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', payload: 0 | 1): void;
}>();

async function onChange(payload: 0 | 1) {
  await updateOutsideDownloadApi(props.fileRecordData.id, {
    outsideDownload: payload,
  });
  emit('update:modelValue', payload);

  return false;
}

async function copyText() {
  const url = `${location.origin}/fm/api/file/out/${props.fileRecordData.filename}`;
  await copy(url);

  ElMessage({ type: 'success', message: '复制成功' });
}
</script>

<style scoped lang="scss"></style>
