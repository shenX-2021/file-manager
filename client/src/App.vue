<template>
  <el-config-provider :size="configStore.state.size">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
import { debounce } from '@src/utils';
import { useConfigStore } from '@src/store';

const configStore = useConfigStore();

configStore.updateSize(window.innerWidth);
window.onresize = debounce((ev) => {
  const width = ev?.target?.innerWidth;
  if (width) {
    configStore.updateSize(width);
  }
});
</script>
