import { axios } from '@src/http/libs';

export interface LoginDto {
  account: string;
  pwd: string;
}

// 登录
export function loginApi(data: LoginDto): Promise<void> {
  return axios.post('/login', data);
}
// 更新cookie
export function updateCookieApi(): Promise<void> {
  return axios.post('/login/cookie');
}
// 登出
export function logoutApi(): Promise<void> {
  return axios.post('/login/logout');
}
