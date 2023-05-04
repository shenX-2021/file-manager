<template>
  <el-tag
    class="file-check-status"
    :color="fileStatusMap[props.checkStatus].color"
  >
    {{ fileStatusMap[props.checkStatus].text }}
  </el-tag>
</template>

<script setup lang="ts">
import { FileCheckStatusEnum } from '@src/enums';

const props = defineProps<{
  checkStatus: FileCheckStatusEnum;
}>();

const fileStatusMap: Record<
  FileCheckStatusEnum,
  { text: string; color: string }
> = {
  [FileCheckStatusEnum.UNCHECKED]: {
    text: '未校验',
    color: '#b4b4ac',
  },
  [FileCheckStatusEnum.FAILURE]: {
    text: '未通过校验',
    color: '#f56c6c',
  },
  [FileCheckStatusEnum.SUCCESSFUL]: {
    text: '已通过校验',
    color: '#67c23a',
  },
};
</script>

<style lang="scss" scoped>
.file-check-status {
  color: #ffffff;
  border: none;
}
</style>
