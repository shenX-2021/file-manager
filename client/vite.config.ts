import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import * as path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  server: {
    port: 8889,
    proxy: {
      '/fm': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/fm/, 'fm'),
      },
    },
  },
  resolve: {
    alias: [
      {
        // 与tsconfig.json的paths对应
        find: '@src',
        replacement: path.resolve(__dirname, 'src'),
      },
    ],
  },
});
