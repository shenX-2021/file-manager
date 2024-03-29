import VConsole from 'vconsole';
import { createApp } from 'vue';
import 'default-passive-events';
import 'element-plus/theme-chalk/src/message.scss';
import 'element-plus/theme-chalk/src/message-box.scss';
import 'element-plus/theme-chalk/src/overlay.scss';
import '@src/css/index.scss';
import '@src/css/global.scss';
import App from './App.vue';
import { router } from '@src/router';
import { createPinia } from 'pinia';

// 移动端调试
if (import.meta.env.DEV) {
  new VConsole();
}

createApp(App).use(createPinia()).use(router).mount('#app');
