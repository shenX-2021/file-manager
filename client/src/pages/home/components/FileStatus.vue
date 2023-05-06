<template>
  <el-tag
    class="file-status"
    :size="configStore.size"
    :color="fileStatusMap[props.status].color"
  >
    {{ fileStatusMap[props.status].text }}
  </el-tag>
</template>

<script setup lang="ts">
import { FileStatusEnum } from '@src/enums';
import { useConfigStore } from '@src/store';

const configStore = useConfigStore();

const props = defineProps<{
  status: FileStatusEnum;
}>();

const fileStatusMap: Record<FileStatusEnum, { text: string; color: string }> = {
  [FileStatusEnum.INIT]: {
    text: '初始化',
    color: '#b4b4ac',
  },
  [FileStatusEnum.CHUNK_UPLOADING]: {
    text: '正在上传切片',
    color: '#30424a',
  },
  [FileStatusEnum.CHUNK_UPLOADED]: {
    text: '切片已上传',
    color: '#67c23a',
  },
  [FileStatusEnum.CHUNK_MERGING]: {
    text: '正在合并切片',
    color: '#409eff',
  },
  [FileStatusEnum.FINISHED]: {
    text: '已完成',
    color: '#67c23a',
  },
};
</script>

<style lang="scss" scoped>
.file-status {
  color: #ffffff;
  border: none;
}
</style>
