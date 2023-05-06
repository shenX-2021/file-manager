import { acceptHMRUpdate, defineStore } from 'pinia';

export type ElSize = 'default' | 'small' | 'large';

export interface ConfigStoreState {
  size: ElSize;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigStoreState => ({
    size: 'default',
  }),
  actions: {
    updateSize(width: number) {
      if (width > 1500) {
        this.size = 'large';
      } else if (width > 800) {
        this.size = 'default';
      } else {
        this.size = 'small';
      }
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useConfigStore, import.meta.hot));
}
