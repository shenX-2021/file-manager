<template>
  <div class="config-dialog" :class="`config-dialog-${configStore.state.size}`">
    <el-dialog
      class="dialog-box"
      :model-value="props.isShow"
      title="设置"
      :width="width"
      :show-close="false"
      top="30vh"
      @close="emit('update:isShow', false)"
    >
      <div class="body">
        <div>
          <div class="fw500">上传带宽：</div>
          <div class="gap-1 w100per"></div>
          <div class="flexCenter">
            <el-switch
              class="mr10"
              :active-value="1"
              active-text="启用"
              :inactive-value="0"
              inactive-text="禁用"
              inline-prompt
              :model-value="configStore.state.uploadBandwidthStatus ?? 0"
              @change="configStore.updateUploadBandwidthStatus"
            />
            <el-input-number
              class="upload-bandwidth-input"
              :model-value="state.uploadBandwidth"
              :precision="0"
              :min="0"
              :step="1024"
              :controls="true"
              :disabled="configStore.state.uploadBandwidthStatus === 0"
              @input="updateUploadBandwidth"
            />
            <span class="unit ml4">kb/s</span>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '@src/store';
import { computed, reactive, watch } from 'vue';
import { debounce } from '@src/utils';

const configStore = useConfigStore();

const state = reactive({
  uploadBandwidth: 0,
});

const props = defineProps<{
  isShow: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:isShow', payload: boolean): void;
}>();

const width = computed(() => {
  if (configStore.state.size === 'small') return '85%';
  if (configStore.state.size === 'default') return '70%';
  return '50%';
});

async function updateUploadBandwidthHandler(bandwidth: number) {
  await configStore.updateUploadBandwidth(bandwidth * 1024);
  state.uploadBandwidth = bandwidth;
}
const updateUploadBandwidth = debounce(updateUploadBandwidthHandler, 300);

watch(
  () => configStore.state.configInit,
  (newVal) => {
    if (newVal) {
      state.uploadBandwidth = Math.floor(
        configStore.state.uploadBandwidth / 1024,
      );
    }
  },
);
</script>

<style scoped lang="scss">
.config-dialog {
  :deep(.el-dialog__header) {
    padding: 8px 0;
    text-align: center;
    margin: 0;

    &:before {
      content: '';
      display: block;
      width: 100%;
      height: 1px;
    }
  }
  .upload-bandwidth-input {
    height: 20px;

    :deep(.el-input__wrapper) {
      box-shadow: none;
      border-bottom: 1px solid
        var(--el-input-border-color, var(--el-border-color));
      padding: 0;
    }
  }
}
.config-dialog-small {
  :deep(.el-dialog__header) {
    padding: 8px 0;
  }
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 30px;
  }
  .upload-bandwidth-input {
    width: 110px;
  }
  .gap-1 {
    height: 8px;
  }
}
.config-dialog-default {
  :deep(.el-dialog__header) {
    padding: 14px 0;
  }
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 60px;
  }
  .upload-bandwidth-input {
    width: 140px;
  }
  .gap-1 {
    height: 16px;
  }
}
.config-dialog-large {
  :deep(.el-dialog__header) {
    padding: 20px 0;
  }
  :deep(.el-dialog__body) {
    padding-top: 10px;
    padding-bottom: 90px;
  }
  .upload-bandwidth-input {
    width: 150px;
  }
  .gap-1 {
    height: 18px;
  }
}

.body {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .unit {
    font-style: italic;
    color: #aaaaaa;
    user-select: none;
  }
}
</style>
