import {
  createRouter,
  createWebHistory,
  NavigationGuardNext,
  RouteLocationNormalized,
  RouteRecordRaw,
} from 'vue-router';
import Home from '@src/pages/home/Home.vue';
import Login from '@src/pages/login/Login.vue';
import { updateCookieApi } from '@src/http/apis';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    async beforeEnter(
      to: RouteLocationNormalized,
      from: RouteLocationNormalized,
      next: NavigationGuardNext,
    ) {
      try {
        await updateCookieApi();
        next();
      } catch (e) {
        next({ name: 'Login' });
      }
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
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
