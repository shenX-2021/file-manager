import AxiosStatic from 'axios';
import { ElMessage } from 'element-plus/es';

export const axios = AxiosStatic.create({
  baseURL: '/',
  timeout: 10000,
});

axios.interceptors.request.use((config) => {
  return config;
});

axios.interceptors.response.use(
  (res) => {
    return res.data;
  },
  (err) => {
    if (err?.message.startsWith('timeout of ')) {
      ElMessage({
        message: '请求超时，请稍后再试',
        type: 'error',
      });
    } else if (err?.message?.startsWith('Network Error')) {
      ElMessage({
        message: '网络异常',
        type: 'error',
      });
    } else if ([500, 502].includes(err?.response?.status)) {
      ElMessage({
        message: '系统异常，请联系管理员',
        type: 'error',
      });
    } else {
      ElMessage({
        message: Array.isArray(err?.response?.data?.message)
          ? err.response.data.message?.[0]
          : err?.response?.data?.message,
        type: 'error',
      });
      // if (err?.response?.status === 401) {
      //   store.commit(MutationTypes.LOGOUT);
      // }
    }

    return Promise.reject(err.response?.data ?? err.message);
  },
);
