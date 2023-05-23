import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { ConfigRo, setConfigApi } from '@src/http/apis';

export type ElSize = 'default' | 'small' | 'large';

export interface ConfigStoreState {
  size: ElSize;
  downloadBandwidth: number;
  downloadBandwidthStatus: 0 | 1;
  uploadBandwidthStatus: 0 | 1;
  uploadBandwidth: number;
  configInit: boolean;
}

export const useConfigStore = defineStore('config', () => {
  const state = reactive<ConfigStoreState>({
    size: 'default',
    downloadBandwidth: 0,
    downloadBandwidthStatus: 0,
    uploadBandwidthStatus: 0,
    uploadBandwidth: 0,
    configInit: false,
  });

  function updateSize(width: number) {
    if (width > 1500) {
      state.size = 'large';
    } else if (width > 800) {
      state.size = 'default';
    } else {
      state.size = 'small';
    }
  }
  function updateUploadBandwidthStatus(status: 0 | 1) {
    return updateConfig('uploadBandwidthStatus', status);
  }
  function updateUploadBandwidth(bandwidth: number) {
    return updateConfig('uploadBandwidth', bandwidth);
  }
  function updateDownloadBandwidthStatus(status: 0 | 1) {
    return updateConfig('downloadBandwidthStatus', status);
  }
  function updateDownloadBandwidth(bandwidth: number) {
    return updateConfig('downloadBandwidth', bandwidth);
  }

  async function updateConfig(
    key:
      | 'downloadBandwidth'
      | 'downloadBandwidthStatus'
      | 'uploadBandwidthStatus'
      | 'uploadBandwidth',
    value,
  ) {
    if (value !== state[key]) {
      await setConfigApi({ [key]: value });

      state[key] = value;
    }
  }

  const uploadBandwidth = computed<number>(() => {
    if (state.uploadBandwidthStatus === 0) return 0;

    return state.uploadBandwidth;
  });

  function initConfig(data: ConfigRo) {
    if (state.configInit) return;

    state.uploadBandwidthStatus = data.uploadBandwidthStatus;
    state.uploadBandwidth = data.uploadBandwidth;
    state.downloadBandwidth = data.downloadBandwidth;
    state.downloadBandwidthStatus = data.downloadBandwidthStatus;

    state.configInit = true;
  }

  return {
    state,
    updateSize,
    initConfig,
    uploadBandwidth,
    updateUploadBandwidth,
    updateUploadBandwidthStatus,
    updateDownloadBandwidth,
    updateDownloadBandwidthStatus,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConfigStore, import.meta.hot));
}
