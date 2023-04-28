import { createApp } from 'vue';
import '@src/css/index.scss';
import '@src/css/global.scss';
import 'element-plus/theme-chalk/src/message.scss';
import 'element-plus/theme-chalk/src/message-box.scss';
import App from './App.vue';
import { router } from '@src/router';

createApp(App).use(router).mount('#app');
