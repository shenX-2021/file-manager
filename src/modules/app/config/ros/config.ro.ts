import { ConfigEntity } from '@src/entities';

export type ConfigRo = Pick<
  ConfigEntity,
  | 'id'
  | 'uploadBandwidth'
  | 'uploadBandwidthStatus'
  | 'downloadBandwidth'
  | 'downloadBandwidthStatus'
>;
