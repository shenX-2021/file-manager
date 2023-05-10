import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tb_config' })
export class ConfigEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'upload_bandwidth_status',
    default: 0,
    comment: '上传带宽限制状态是否开启',
  })
  uploadBandwidthStatus: 0 | 1;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'upload_bandwidth',
    default: 0,
    comment: '上传带宽限制，单位kb',
  })
  uploadBandwidth: number;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'download_bandwidth_status',
    default: 0,
    comment: '下载带宽限制状态是否开启',
  })
  downloadBandwidthStatus: 0 | 1;

  @Column({
    type: 'integer',
    nullable: false,
    name: 'download_bandwidth',
    default: 0,
    comment: '下载带宽限制，单位kb',
  })
  downloadBandwidth: number;
}
