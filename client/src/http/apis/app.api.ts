import { axios } from '@src/http/libs';

export interface ConfigRo {
  downloadBandwidth: number;
  downloadBandwidthStatus: 0 | 1;
  uploadBandwidthStatus: 0 | 1;
  uploadBandwidth: number;
}
export interface SetConfigDto {
  downloadBandwidth?: number;
  downloadBandwidthStatus?: 0 | 1;
  uploadBandwidthStatus?: 0 | 1;
  uploadBandwidth?: number;
}

// 获取配置
export function getConfigApi(): Promise<ConfigRo> {
  return axios.get('/app/config');
}
// 更新配置
export function setConfigApi(data: SetConfigDto) {
  return axios.patch('/app/config', data);
}
