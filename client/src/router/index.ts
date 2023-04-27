import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Home from '@src/pages/home/Home.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  // {
  //   path: '/404',
  //   name: '404',
  //   component: Home,
  // },
];

export const router = createRouter({
  history: createWebHistory('/fm/web'),
  routes,
});
