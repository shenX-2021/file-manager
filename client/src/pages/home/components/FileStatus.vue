<template>
  <el-tag
    class="file-status"
    :size="configStore.size"
    :color="fileStatusMap[props.status].color"
  >
    {{ fileStatusMap[props.status].text }}
    <span v-if="props.status === FileStatusEnum.CHUNK_MERGING">
      {{ state.percentage }}%
    </span>
  </el-tag>
</template>

<script setup lang="ts">
import { FileStatusEnum } from '@src/enums';
import { useConfigStore } from '@src/store';
import { reactive, watch } from 'vue';
import { mergeChunkApi } from '@src/http/apis';
import { useList } from '@src/pages/home/composables';

const configStore = useConfigStore();
const { listState } = useList();

const state = reactive({
  percentage: 0,
});

const props = defineProps<{
  status: FileStatusEnum;
  fileHash: string;
  size: number;
}>();
const emit = defineEmits<{
  (e: 'after-merge'): void;
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

watch(
  () => props.status,
  (newVal) => {
    if (newVal === FileStatusEnum.CHUNK_MERGING) {
      clearTimeout(listState.mergeTimer);
      listState.mergeTimer = setTimeout(async function checkMergePercentage() {
        const res = await mergeChunkApi({
          fileHash: props.fileHash,
          size: props.size,
        });
        state.percentage = res.percentage;
        if (state.percentage !== 100) {
          listState.mergeTimer = setTimeout(checkMergePercentage, 1000);
        } else {
          emit('after-merge');
        }
      }, 500);
    } else {
      clearTimeout(listState.mergeTimer);
    }
  },
);
</script>

<style lang="scss" scoped>
.file-status {
  color: #ffffff;
  border: none;
}
</style>
